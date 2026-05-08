import z from 'zod'
import { useAppStore } from '@stores/appStore.js'

const phases = ['active', 'waiting', 'off']

const nextPhase = function() {
    const currentIndex = phases.indexOf(this.data.phase)
    this.data.phase = phases[(currentIndex + 1) % phases.length]
}

const addItem = function() {
    const nextId = this.data.list.length + 1
    this.data.list = [
        ...this.data.list,
        { id: nextId, name: `Item ${nextId}` }
    ]
}

const removeItem = function() {
    this.data.list = this.data.list.slice(0, -1)
}

const toggleList = function() {
    this.data.listVisible = !this.data.listVisible
}

const renameLocalTitle = function() {
    this.data.name = this.data.name === 'WebX Component'
        ? 'Live prop from Home'
        : 'WebX Component'
}

const renameSharedTitle = function() {
    this.app.toggleSharedTitle()
}

const incrementSharedCount = function() {
    this.app.incrementSharedCount()
}

export default {
    template: 'Home',
    stores: {
        app: useAppStore
    },
    data: {
        name: 'WebX Component',
        phase: 'active',
        listVisible: true,
        note: 'Type here and state follows.',
        list: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
            { id: 3, name: 'Item 3' }
        ]
    },
    method: {
        nextPhase,
        addItem,
        removeItem,
        toggleList,
        renameLocalTitle,
        renameSharedTitle,
        incrementSharedCount
    },
    onCfx: {
        'app:updateTitle': {
            schema: z.string(),
            handler(newTitle) {
                console.log('Shared title changed to:', newTitle)
                this.data.name = newTitle
            }
        },

        'app:updateList': {
            schema: z.array(z.object({
                id: z.number(),
                name: z.string()
            })),
            handler(newList) {
                console.log('Shared list updated:', newList)
                this.data.list = newList
            }
        }
    },
    onMounted() {
        console.log('Home mounted:', this.data.name)
    },
    onUnmounted() {
        console.log('Home unmounted')
    }
}
