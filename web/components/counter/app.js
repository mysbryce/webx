import z from 'zod'
import { useAppStore } from '@stores/appStore.js'

const increment = function() {
    this.data.count++
}

const incrementShared = function() {
    this.app.incrementSharedCount()
}

const fetchCounter = async function() {
    const response = await this.cfx.call('counter:getValue', {
        title: this.props.title,
        count: this.data.count
    }, {
        ok: true,
        value: this.data.count
    })

    console.log('CFX counter:getValue response:', response)
}

export default {
    template: 'Counter',
    stores: {
        app: useAppStore
    },
    props: {
        title: z.string()
    },
    data: {
        count: 0
    },
    method: {
        increment,
        incrementShared,
        fetchCounter
    },
    watch: {
        count(value, previousValue) {
            console.log('count changed:', previousValue, value)
        },
        title(value, previousValue) {
            console.log('title prop changed:', previousValue, value)
        }
    },
    onMounted() {
        console.log('Counter component mounted with title:', this.props.title)
    },
    onUnmounted() {
        console.log('Counter component unmounted')
    }
}
