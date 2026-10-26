// Carriers cap MMS around 1 MB, so photos are shrunk in the browser before upload.
// Small JPEG/PNG/GIF files pass through untouched; everything else becomes a JPEG.
const SENDABLE_TYPES = ['image/jpeg', 'image/png', 'image/gif']
const MAX_SIDE = 1600
const QUALITIES = [0.85, 0.75, 0.65, 0.55]

export async function shrinkImage(file: File, maxBytes = 1000000): Promise<File> {
  if(SENDABLE_TYPES.includes(file.type) && file.size <= maxBytes) return file
  // Canvas would keep only the first frame
  if(file.type === 'image/gif') throw new Error('Animated GIFs must be under 1 MB.')

  const image = await decode(file)
  let scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height))

  while(scale > 0.05){
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const ctx = canvas.getContext('2d')!
    // White behind PNG transparency, which JPEG would otherwise turn black
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    for(const quality of QUALITIES){
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
      if(blob && blob.size <= maxBytes){
        const name = (file.name.replace(/\.[^.]*$/, '') || 'image') + '.jpg'
        return new File([blob], name, {type: 'image/jpeg'})
      }
    }
    scale *= 0.75
  }
  throw new Error('The image could not be made small enough to send.')
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    if(typeof createImageBitmap === 'function') return await createImageBitmap(file)
  } catch(e) {}

  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject()
      img.src = url
    })
  } catch(e) {
    throw new Error("This image format isn't supported. Use JPEG or PNG.")
  } finally {
    URL.revokeObjectURL(url)
  }
}
