const messageContainer = document.createElement('div')
messageContainer.className = 'message-container'
messageContainer.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
`
document.body.appendChild(messageContainer)

function createMessage({ content, type = 'info', duration = 5 }) {
  const msgEl = document.createElement('div')
  msgEl.className = `message-item message-${type}`
  msgEl.style.cssText = `
    padding: 12px 20px;
    border-radius: 4px;
    color: #fff;
    font-size: 14px;
    min-width: 200px;
    max-width: 350px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease;
    cursor: pointer;
  `

  const colors = {
    info: '#1890ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#f5222d',
    loading: '#1890ff'
  }
  msgEl.style.backgroundColor = colors[type] || colors.info
  msgEl.textContent = content || ''

  messageContainer.appendChild(msgEl)

  if (duration > 0) {
    setTimeout(() => {
      msgEl.style.animation = 'slideOut 0.3s ease'
      setTimeout(() => msgEl.remove(), 300)
    }, duration * 1000)
  }

  msgEl.addEventListener('click', () => {
    msgEl.remove()
  })

  return msgEl
}

const style = document.createElement('style')
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`
document.head.appendChild(style)

export default {
  info(config) {
    const content = typeof config === 'string' ? config : config.content
    return createMessage({ content, type: 'info' })
  },
  success(config) {
    const content = typeof config === 'string' ? config : config.content
    return createMessage({ content, type: 'success' })
  },
  warning(config) {
    if (typeof config === 'string') {
      return createMessage({ content: config, type: 'warning', duration: 5 })
    }
    return createMessage({ ...config, type: 'warning', duration: 5 })
  },
  error(config) {
    if (typeof config === 'string') {
      return createMessage({ content: config, type: 'error', duration: 5 })
    }
    return createMessage({ ...config, type: 'error', duration: 5 })
  },
  loading(config) {
    const content = typeof config === 'string' ? config : config.content
    return createMessage({ content, type: 'loading' })
  },
}
