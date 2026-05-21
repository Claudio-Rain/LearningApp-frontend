# Background Scripts Architecture

## Diagrama General

```mermaid
graph TB
    subgraph Chrome["Chrome Extension"]
        BG["src/background.js<br/>(Orquestador)"]
        CONTENT["src/content.js<br/>(Content Script)"]
    end
    
    subgraph BGModule["background/ (Servicios & Utilidades)"]
        subgraph Services["Services"]
            ALARM["alarmService.js<br/>- createAlarms<br/>- checkSessionTime<br/>- isSessionActive"]
            NOTIF["notificationService.js<br/>- sendNotification<br/>- selectItemByStrength"]
            PROGRESS["progressService.js<br/>- recordAttempt"]
            MSG["messageHandler.js<br/>- setupMessageListeners<br/>- handleButton clicks"]
        end
        
        subgraph Utils["Utils"]
            STORAGE["storage.js<br/>- getStudySettings<br/>- getCurrentItem<br/>- setCurrentItem"]
            NOTIFUTIL["notification.js<br/>- formatTitle<br/>- formatMessage"]
        end
        
        CONST["constants.js<br/>(Todas las constantes)"]
    end
    
    subgraph Database["src/database/"]
        DB["Database Operations<br/>- getLearningItems<br/>- getAllCardProgress<br/>- createAttemptLog<br/>- updateCardProgress"]
    end
    
    subgraph Chrome_APIs["Chrome APIs"]
        CHROME_ALARMS["chrome.alarms"]
        CHROME_NOTIF["chrome.notifications"]
        CHROME_STORAGE["chrome.storage"]
        CHROME_TABS["chrome.tabs"]
    end
    
    %% Relaciones background.js
    BG -->|import| ALARM
    BG -->|import| NOTIF
    BG -->|import| MSG
    BG -->|escucha onAlarm| CHROME_ALARMS
    
    %% Relaciones alarmService
    ALARM -->|import| STORAGE
    ALARM -->|importa| CONST
    ALARM -->|usa| CHROME_ALARMS
    
    %% Relaciones notificationService
    NOTIF -->|import| STORAGE
    NOTIF -->|import| NOTIFUTIL
    NOTIF -->|import| CONST
    NOTIF -->|import| DB
    NOTIF -->|envia mensajes| CONTENT
    NOTIF -->|usa| CHROME_NOTIF
    NOTIF -->|usa| CHROME_TABS
    
    %% Relaciones progressService
    PROGRESS -->|import| DB
    PROGRESS -->|import| CONST
    
    %% Relaciones messageHandler
    MSG -->|import| STORAGE
    MSG -->|import| PROGRESS
    MSG -->|escucha| CHROME_NOTIF
    MSG -->|escucha| CHROME_TABS
    
    %% Relaciones storage
    STORAGE -->|import| CONST
    STORAGE -->|usa| CHROME_STORAGE
    
    %% Content script
    CONTENT -->|recibe mensaje| BG
    CONTENT -->|envía mensaje| BG
    CONTENT -->|usa| CHROME_TABS
    
    style BG fill:#4CAF50,color:#fff
    style CONTENT fill:#2196F3,color:#fff
    style ALARM fill:#FF9800,color:#fff
    style NOTIF fill:#FF9800,color:#fff
    style PROGRESS fill:#FF9800,color:#fff
    style MSG fill:#FF9800,color:#fff
    style STORAGE fill:#9C27B0,color:#fff
    style NOTIFUTIL fill:#9C27B0,color:#fff
    style CONST fill:#673AB7,color:#fff
    style DB fill:#00BCD4,color:#fff
```

## Flujo de Ejecución

### 1. Inicialización (onInstalled, onStartup)
```
background.js
    ↓
initializeAlarms()
    ↓
alarmService.createAlarms()
    ↓
chrome.alarms.create("sessionAlarm")
chrome.alarms.create("notificationAlarm")
```

### 2. Verificación de Sesión (cada 1 minuto)
```
chrome.alarms.onAlarm (sessionAlarm)
    ↓
alarmService.checkSessionTime()
    ↓
getStudySettings() → chrome.storage.local.get()
    ↓
actualiza sessionActive flag
```

### 3. Envío de Notificación (cada N segundos si sesión activa)
```
chrome.alarms.onAlarm (notificationAlarm)
    ↓
notificationService.sendNotification()
    ↓
getStudySettings() → getLearningItems() → getAllCardProgress()
    ↓
selectItemByStrength() → elige item
    ↓
chrome.notifications.create() (notificación nativa)
    ↓
chrome.tabs.sendMessage() (envía a content script)
```

### 4. Grabación de Intento (usuario hace click)
```
chrome.notifications.onButtonClicked
    ↓
messageHandler.handleNotificationButtonClick()
    ↓
progressService.recordAttempt(itemId, buttonIndex)
    ↓
createAttemptLog() → syncAttemptLogs()
    ↓
updateCardProgress() o createCardProgress()
    ↓
syncCardProgress()
    ↓
chrome.notifications.clear()
```

## Responsabilidades de cada módulo

### alarmService.js
- ⏰ Gestión de alarmas de Chrome
- 📊 Control del estado de sesión (activa/inactiva)
- 🔄 Coordinación con intervalos de notificación

### notificationService.js
- 📱 Selección inteligente de items (basada en strength)
- 🎨 Creación de notificaciones nativas
- 💬 Envío de mensajes a content script
- 🎯 Lógica de priorización (weak → good → mastered)

### progressService.js
- 📝 Grabación de intentos de usuario
- 📊 Actualización del strength_score
- 🔄 Sincronización con base de datos
- ⚙️ Cálculo de ease scores

### messageHandler.js
- 👂 Escucha de eventos de Chrome
- 📨 Manejo de mensajes del content script
- 🔗 Puente entre background y content scripts
- 🧹 Limpieza de notificaciones

### storage.js
- 💾 Gestión de configuraciones de estudio
- 📦 Almacenamiento del item actual en notificación
- 🔍 Recuperación de datos locales

### notification.js
- ✂️ Extracción de texto plano de contenido
- 📏 Formateo y truncado de títulos/mensajes
- 🎭 Conversión de estructura Tiptap a texto

### constants.js
- 🔢 Todos los valores configurables
- ⏱️ Intervalos de tiempo
- 🏷️ Labels y configuraciones por defecto

## Comunicación entre Scripts

### background.js ↔ content.js

**Background envía a Content:**
```javascript
chrome.tabs.sendMessage(tabId, {
  action: 'showQuestion',    // Mostrar modal
  item: nextItem,
  notificationId: notificationId
})

chrome.tabs.sendMessage(tabId, {
  action: 'hideQuestion'     // Ocultar modal
})
```

**Content envía a Background:**
```javascript
chrome.runtime.sendMessage({
  action: 'buttonClicked',    // Usuario clickeó botón
  buttonIndex: 0,
  notificationId: notificationId
})

chrome.runtime.sendMessage({
  action: 'questionClosed'    // Usuario cerró modal
  notificationId: notificationId
})
```

## Flujos de Datos

### Lectura de Configuración
```
messageHandler/alarmService
    ↓
storage.getStudySettings()
    ↓
chrome.storage.local.get([keys])
    ↓
Retorna: {collectionId, startHour, endHour, intervalSeconds}
```

### Selección de Item para Notificación
```
notificationService.selectItemByStrength()
    ↓
Calcula strength para cada item
    ↓
Prioriza: weak (0-0.5) > good (0.5-0.8) > mastered
    ↓
Usa weighted random selection
    ↓
Retorna: bestItem
```

### Actualización de Progreso
```
progressService.recordAttempt(itemId, buttonIndex)
    ↓
Obtiene easeScore del button
    ↓
createAttemptLog() + syncAttemptLogs()
    ↓
Calcula newStrength = strength + easeScore
    ↓
updateCardProgress() + syncCardProgress()
    ↓
Database sincronizada
```
