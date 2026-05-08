const OVERLAY_ID = 'webx-error-overlay'

const ensureOverlay = () => {
    let overlay = document.getElementById(OVERLAY_ID)
    if (overlay) return overlay

    overlay = document.createElement('div')
    overlay.id = OVERLAY_ID
    overlay.style.cssText = [
        'position:fixed',
        'right:16px',
        'bottom:16px',
        'z-index:2147483647',
        'width:min(460px,calc(100vw - 32px))',
        'max-height:min(420px,calc(100vh - 32px))',
        'overflow:auto',
        'background:#101114',
        'color:#f5f7fb',
        'border:1px solid #30343d',
        'box-shadow:0 18px 50px rgba(0,0,0,.35)',
        'border-radius:8px',
        'font:13px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace',
        'padding:14px'
    ].join(';')

    document.body.appendChild(overlay)
    return overlay
}

const createCloseButton = (overlay) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'x'
    button.style.cssText = [
        'position:absolute',
        'top:8px',
        'right:10px',
        'border:0',
        'background:transparent',
        'color:#aeb4c2',
        'font:16px/1 ui-monospace,SFMono-Regular,Consolas,monospace',
        'cursor:pointer'
    ].join(';')
    button.addEventListener('click', () => overlay.remove())

    return button
}

export const showErrorOverlay = (error) => {
    const overlay = ensureOverlay()
    overlay.replaceChildren()

    const title = document.createElement('div')
    title.textContent = error.title || 'WebX Error'
    title.style.cssText = 'color:#ff6b6b;font-weight:700;margin:0 28px 8px 0'

    const message = document.createElement('div')
    message.textContent = error.message || String(error)
    message.style.cssText = 'white-space:pre-wrap;margin-bottom:10px'

    overlay.append(createCloseButton(overlay), title, message)

    if (error.details) {
        const details = document.createElement('pre')
        details.textContent = error.details
        details.style.cssText = [
            'white-space:pre-wrap',
            'margin:0',
            'padding:10px',
            'background:#181b20',
            'border-radius:6px',
            'color:#d7dae2'
        ].join(';')
        overlay.appendChild(details)
    }
}

export const reportError = (error) => {
    console.error(error)
    showErrorOverlay(error)
}
