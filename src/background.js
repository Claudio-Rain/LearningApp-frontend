import { getLearningItems } from './database/idb';

let sessionActive = false

// Crear alarmas al iniciar la extensión
chrome.runtime.onInstalled.addListener(() => {
  createAlarms()
})

chrome.runtime.onStartup.addListener(() => {
  createAlarms()
})

function createAlarms() {
  chrome.alarms.create("sessionAlarm", {
    periodInMinutes: 1
  })
  const minutes = 1
  const endTime = Date.now() + minutes * 60 * 1000

  const intervalSeconds = 30  // 👈 X tiempo
  const intervalMinutes = intervalSeconds / 60

  chrome.storage.local.set({
    endTime,
    lastMinutes: minutes,
    intervalSeconds
  })

  chrome.alarms.create("notificationAlarm", {
    periodInMinutes: intervalMinutes
  })
}

chrome.alarms.onAlarm.addListener((alarm) => {

  if (alarm.name === "sessionAlarm") {
    checkSessionTime()
  }

  if (alarm.name === "notificationAlarm") {
    if (sessionActive) {
      console.log("Sending notification")
      sendNotification()
    }
  }
})

function checkSessionTime() {
  console.log("checking session time")
  const now = new Date()
  const hour = now.getHours()

  // Inicia sesión a las 18:00
  if (hour === 21 && !sessionActive) {
    sessionActive = true
  }

  // Termina sesión a las 19:00
  if (hour === 22 && sessionActive) {
    sessionActive = false
  }
  console.log("preparing notification" +  hour +  sessionActive);
}

async function sendNotification() {
  
  const collectionId = 15 
  
  const items = await getLearningItems(collectionId)
  
  console.log("checked session time", items);
  if (!items || items.length === 0) return

  const randomQuestion = items[Math.floor(Math.random() * items.length)];

  chrome.notifications.create("flashCard_" + Date.now(), {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon.png"),
    title: randomQuestion.title,
    message: JSON.stringify(randomQuestion.content ?? {}),
    buttons: [{ title: "Review Later" }, {title: "Answered Correctly"} ],
    priority: 2,
    silent: true,
    requireInteraction: true,
  }, (id) => {
    setTimeout(() => {
      chrome.notifications.clear(id);
    }, 30000);
  });
}

function stopSessionManually() {
  sessionActive = false
  chrome.notifications.clearAll?.()
  console.log("Sesión detenida manualmente")
}