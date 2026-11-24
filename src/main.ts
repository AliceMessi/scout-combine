const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
canvas.width = 1600
canvas.height = 900
ctx.fillStyle = '#0b1530'
ctx.fillRect(0, 0, 1600, 900)
ctx.fillStyle = '#ffffff'
ctx.font = 'bold 72px system-ui, sans-serif'
ctx.textAlign = 'center'
ctx.fillText('SCOUT COMBINE', 800, 450)
