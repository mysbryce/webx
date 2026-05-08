#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import process from 'node:process'

const DEFAULT_TEMPLATE_REPO = 'https://github.com/mysbryce/webx.git'

const colors = {
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
}

const log = {
    info(message = '') {
        console.log(message)
    },
    success(message) {
        console.log(`${colors.green}✓${colors.reset} ${message}`)
    },
    warn(message) {
        console.log(`${colors.yellow}!${colors.reset} ${message}`)
    },
    error(message) {
        console.error(`${colors.red}✕${colors.reset} ${message}`)
    }
}

const parseArgs = (argv) => {
    const args = []
    const flags = {}

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index]

        if (!value.startsWith('--')) {
            args.push(value)
            continue
        }

        const [rawName, inlineValue] = value.slice(2).split('=')
        const nextValue = argv[index + 1]

        if (inlineValue !== undefined) {
            flags[rawName] = inlineValue
            continue
        }

        if (nextValue && !nextValue.startsWith('--')) {
            flags[rawName] = nextValue
            index += 1
            continue
        }

        flags[rawName] = true
    }

    return { args, flags }
}

const run = (command, args, options = {}) => {
    const result = spawnSync(command, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        ...options
    })

    if (result.status !== 0) {
        throw new Error(`Command failed: ${command} ${args.join(' ')}`)
    }
}

const commandExists = (command) => {
    const checker = process.platform === 'win32' ? 'where' : 'command'
    const args = process.platform === 'win32' ? [command] : ['-v', command]
    const result = spawnSync(checker, args, {
        stdio: 'ignore',
        shell: process.platform !== 'win32'
    })

    return result.status === 0
}

const findPackageDirs = (root) => {
    const dirs = []
    const ignored = new Set(['.git', 'node_modules', '.next', '.source', 'dist', 'out'])

    const walk = (directory, depth = 0) => {
        if (depth > 2) return

        const entries = readdirSync(directory, { withFileTypes: true })
        if (entries.some((entry) => entry.isFile() && entry.name === 'package.json')) {
            dirs.push(directory)
        }

        for (const entry of entries) {
            if (!entry.isDirectory() || ignored.has(entry.name)) continue
            walk(join(directory, entry.name), depth + 1)
        }
    }

    walk(root)
    return dirs
}

const installDependencies = (projectDir, packageManager) => {
    const packageDirs = findPackageDirs(projectDir)

    if (!packageDirs.length) {
        log.warn('No package.json found, skipped dependency install.')
        return
    }

    for (const packageDir of packageDirs) {
        log.info(`Installing dependencies in ${packageDir}`)
        run(packageManager, ['install'], { cwd: packageDir })
    }
}

const assertEmptyTarget = (targetDir) => {
    if (!existsSync(targetDir)) return

    const entries = readdirSync(targetDir)
    if (entries.length > 0) {
        throw new Error(`Target directory is not empty: ${targetDir}`)
    }
}

const createProject = (argv) => {
    const { args, flags } = parseArgs(argv)
    const projectName = args[0]

    if (!projectName) {
        throw new Error('Missing project name. Example: bunx webx create my-app')
    }

    const targetDir = resolve(process.cwd(), projectName)
    const repo = flags.repo || flags.template || process.env.WEBX_TEMPLATE_REPO || DEFAULT_TEMPLATE_REPO
    const branch = flags.branch
    const packageManager = flags.packageManager || flags.pm || (commandExists('bun') ? 'bun' : 'npm')
    const shouldInstall = flags['no-install'] ? false : flags.install !== false && flags.install !== 'false'
    const keepGit = flags['keep-git'] === true || flags['keep-git'] === 'true'

    assertEmptyTarget(targetDir)
    mkdirSync(targetDir, { recursive: true })

    const cloneArgs = ['clone', '--depth', '1']
    if (branch) cloneArgs.push('--branch', branch)
    cloneArgs.push(repo, targetDir)

    log.info(`Creating WebX project in ${targetDir}`)
    run('git', cloneArgs)

    if (!keepGit) {
        rmSync(join(targetDir, '.git'), { recursive: true, force: true })
    }

    if (shouldInstall) {
        installDependencies(targetDir, packageManager)
    }

    log.success(`Created ${projectName}`)
    log.info('')
    log.info('Next steps:')
    log.info(`  cd ${projectName}`)
    if (!shouldInstall) log.info(`  ${packageManager} install`)
}

const getComponentDirs = (componentsDir) => {
    if (!existsSync(componentsDir)) return []

    return readdirSync(componentsDir)
        .map((name) => {
            const dir = join(componentsDir, name)
            return { name, dir }
        })
        .filter(({ dir }) => statSync(dir).isDirectory())
        .filter(({ dir }) => existsSync(join(dir, 'app.js')) && existsSync(join(dir, 'template.html')))
        .map(({ name }) => name)
        .sort((a, b) => a.localeCompare(b))
}

const readJsonFile = (filePath, fallback) => {
    if (!existsSync(filePath)) return fallback

    try {
        return JSON.parse(readFileSync(filePath, 'utf8'))
    } catch (error) {
        throw new Error(`Invalid JSON in ${filePath}: ${error.message}`)
    }
}

const generateManifest = (argv) => {
    const { flags } = parseArgs(argv)
    const root = resolve(process.cwd(), flags.root || '.')
    const webDir = resolve(root, flags.web || 'web')
    const componentsDir = resolve(webDir, flags.components || 'components')
    const manifestPath = resolve(webDir, flags.config || 'webx.json')
    const components = getComponentDirs(componentsDir)

    if (!components.length) {
        throw new Error(`No components found in ${componentsDir}`)
    }

    const current = readJsonFile(manifestPath, {})
    const main = flags.main || current.main || (components.includes('home') ? 'home' : components[0])

    if (!components.includes(main)) {
        throw new Error(`Main component "${main}" was not found in ${componentsDir}`)
    }

    const manifest = {
        ...current,
        main,
        components: components.filter((component) => component !== main)
    }

    log.info(`${colors.bold}Components${colors.reset}`)
    for (const component of components) {
        const marker = component === main ? 'main' : 'component'
        log.info(`  ${component} ${colors.dim}(${marker})${colors.reset}`)
    }

    if (flags['dry-run']) {
        log.info('')
        log.info(JSON.stringify(manifest, null, 4))
        return
    }

    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 4)}\n`)
    log.success(`Updated ${manifestPath}`)
}

const printHelp = () => {
    log.info(`${colors.bold}webx${colors.reset}`)
    log.info('')
    log.info('Usage:')
    log.info('  bunx webx create <name> [--repo <url>] [--branch <name>] [--no-install]')
    log.info('  bunx webx generate [--main <component>] [--web web] [--dry-run]')
    log.info('')
    log.info('Commands:')
    log.info('  create      Clone a WebX template from GitHub and install dependencies')
    log.info('  generate    Scan web/components and update web/webx.json')
}

const main = () => {
    const [command, ...argv] = process.argv.slice(2)

    try {
        if (!command || command === 'help' || command === '--help' || command === '-h') {
            printHelp()
            return
        }

        if (command === 'create') {
            createProject(argv)
            return
        }

        if (command === 'generate') {
            generateManifest(argv)
            return
        }

        throw new Error(`Unknown command: ${command}`)
    } catch (error) {
        log.error(error.message)
        process.exitCode = 1
    }
}

main()
