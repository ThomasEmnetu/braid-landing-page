export const mediaUrl = (name: string, revision?: string) => `${import.meta.env.BASE_URL}media/${name}${revision ? `?v=${encodeURIComponent(revision)}` : ''}`
