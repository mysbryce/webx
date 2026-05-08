import { createStore } from '@wbx/core/store.js'

export const useAppStore = createStore((set) => ({
    sharedTitle: 'Shared title',
    sharedCount: 0,
    toggleSharedTitle() {
        set((state) => ({
            sharedTitle: state.sharedTitle === 'Shared title'
                ? 'Updated shared title'
                : 'Shared title'
        }))
    },
    incrementSharedCount() {
        set((state) => ({
            sharedCount: state.sharedCount + 1
        }))
    }
}))
