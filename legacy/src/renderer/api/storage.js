import localforage from 'localforage'

// IndexedDB can hang in Electron when quota/service-worker storage is corrupted.
localforage.config({
  driver: localforage.LOCALSTORAGE,
  name: 'updrive',
  storeName: 'updrive_store',
})

export default localforage
