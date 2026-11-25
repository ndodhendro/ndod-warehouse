const tombolZoom = new Set(["+", "-", "=", "_", "0"])

function cegah(event: Event) {
  event.preventDefault()
}

document.addEventListener("gesturestart", cegah, { passive: false })
document.addEventListener("gesturechange", cegah, { passive: false })

document.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length > 1) event.preventDefault()
  },
  { passive: false },
)

window.addEventListener(
  "wheel",
  (event) => {
    if (event.ctrlKey) event.preventDefault()
  },
  { passive: false },
)

window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && tombolZoom.has(event.key)) event.preventDefault()
})
