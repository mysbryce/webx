import getFileContent from '@wbx/utils/getFileContent.js'
import { webxSchema } from '@wbx/types/essentials.js'
import render from '@wbx/utils/render.js'

let WEBX = {}
const COMPONENTS = {}

const validateComponent = async (componentName) => {
    const appPath = `@components/${componentName}/app.js`
    const templatePath = `./components/${componentName}/template.html`

    try {
        const appModule = await import(appPath)
        await getFileContent(templatePath)

        if ('template' in appModule.default) {
            COMPONENTS[appModule.default.template] = {
                name: componentName,
                app: appModule.default
            }
        }
    } catch (error) {
        console.error(`Error loading component ${componentName}:`, error)
    }
}

const intializeApp = async () => {
    try {
        const webx = await getFileContent('./webx.json')
        WEBX = JSON.parse(webx)
        WEBX.components.push(WEBX.main)

        const webxValidation = webxSchema.safeParse(WEBX)
        if (!webxValidation.success) {
            console.error('Invalid webx.json format:', webxValidation.error)
            return
        }
    } catch (error) {
        console.error('Error loading webx.json:', error)
    }

    for (const component of WEBX.components) {
        await validateComponent(component)
    }

    const appElement = document.getElementById('app')
    if (!appElement) return console.error('App element not found')

    render(WEBX.main, appElement, COMPONENTS)
}

intializeApp()