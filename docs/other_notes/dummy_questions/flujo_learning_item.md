# Flujo de Extracción y Registro de Learning Items

## Diagrama Mermaid

```mermaid
graph TD
    A["🎯 Background Script iniciado<br/>background.js"] --> B["Inicializa Alarms<br/>alarmService.js"]
    B --> C{"Cada X segundos<br/>contentAlarm"}
    B --> D{"Cada Y segundos<br/>notificationAlarm"}
    
    C --> E["fetchRandomContent()<br/>contentService.js"]
    E --> F["Obtiene Learning Items<br/>de la BD<br/>getLearningItems"]
    E --> G["Obtiene Card Progress<br/>getAllCardProgress"]
    F --> H["Selecciona Item aleatorio<br/>basado en strength_score<br/>selectRandomContent"]
    H --> I["⭐ Item.id<br/>es vital aquí"]
    I --> J["setCurrentContent<br/>Chrome Storage"]
    J --> K["Notifica a TODAS<br/>las tabs"]
    
    D --> L["sendNotification()<br/>notificationService.js"]
    L --> F2["Obtiene Learning Items"]
    L --> G2["Obtiene Card Progress"]
    F2 --> M["Selecciona Item por strength<br/>selectItemByStrength"]
    M --> N["Genera notificationId<br/>flashcard-{timestamp}"]
    N --> O["⭐ Guarda en Storage<br/>setCurrentItem<br/>item + _notificationId"]
    O --> P["Envía a tabs<br/>action: showQuestion"]
    O --> Q["Crea Native Notification"]
    
    K --> R["Content Script<br/>content.js"]
    P --> R
    
    R --> S["updateContentDisplay<br/>Muestra en widget"]
    R --> T["showQuestion<br/>Muestra en modal"]
    R --> U["Guarda en variable<br/>currentNotificationId"]
    
    S --> V["👤 Usuario interactúa"]
    T --> V
    
    V --> W{"Tipo de interacción"}
    W -->|Click Rating Button| X["recordRating<br/>action: recordRating<br/>score + notificationId"]
    W -->|Click Modal Button| Y["buttonClicked<br/>action: buttonClicked<br/>buttonIndex + notificationId"]
    
    X --> Z["Envía mensaje<br/>a background"]
    Y --> Z
    
    Z --> AA["messageHandler.js<br/>handleContentScriptMessage"]
    AA --> AB["handleButtonClickedFromContent<br/>o registra rating"]
    
    AB --> AC["getCurrentItem<br/>Chrome Storage<br/>⭐ Recupera el item.id"]
    AC --> AD["recordAttempt<br/>progressService.js<br/>itemId + buttonIndex"]
    
    AD --> AE["createAttemptLog<br/>learning_item_id: itemId<br/>ease_score: del botón<br/>created_at: timestamp"]
    AD --> AF["Obtiene progress actual<br/>getAllCardProgress"]
    AF --> AG["Calcula nuevo strength_score<br/>strength + ease_score"]
    
    AG --> AH["updateCardProgress<br/>o createCardProgress"]
    AH --> AI["syncCardProgress<br/>Sincroniza con BD"]
    
    AI --> AJ["✅ Attempt Log registrado"]
    AJ --> AK["clearCurrentItem<br/>Limpia Storage"]
    
    style I fill:#ffeb3b
    style O fill:#ffeb3b
    style AC fill:#ffeb3b
    style AJ fill:#4caf50
    
    classDef module fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef database fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    classDef ui fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    
    class A,AA,E,L,H,M module
    class J,O,AC storage
    class F,G,F2,G2,AE,AF,AH,AI database
    class R,S,T,V,W,X,Y ui
```

---

## Explicación del flujo (paso a paso)

### 1️⃣ **EXTRACCIÓN DEL LEARNING ITEM**

**Módulo: `contentService.js` y `notificationService.js`**

- Cada X segundos → `fetchRandomContent()` obtiene items de la BD
- Selecciona uno aleatorio según `strength_score` (favorece items débiles)
- **⭐ El `item.id` se obtiene aquí y es CRUCIAL**

### 2️⃣ **ALMACENAMIENTO EN CHROME STORAGE**

**Módulo: `storage.js`**

```javascript
// El item completo con su ID se guarda en Chrome Local Storage
await setCurrentItem({ 
  ...item,           // ← Contiene id, title, content
  _notificationId: notificationId
})
```

### 3️⃣ **MOSTRACIÓN EN UI**

**Módulo: `content.js`**

- Recibe mensaje: `action: 'showQuestion'`
- Muestra el modal y widget con el contenido
- **Guarda `notificationId` en variable** `currentNotificationId`

### 4️⃣ **REGISTRO DE ATTEMPT LOG (el click)**

**Flujo de módulos:**

```
content.js (click) 
  → envía mensaje con notificationId
  
  → messageHandler.js (recibe)
  
  → getCurrentItem() (obtiene el item.id del Storage)
  
  → recordAttempt(itemId, buttonIndex)
  
  → progressService.js:
     - createAttemptLog(itemId, ease_score)
     - updateCardProgress(itemId, newStrength)
     - syncAttemptLogs() y syncCardProgress()
```

---

## 🎯 Módulos clave

| Módulo | Función |
|--------|---------|
| **contentService.js** | Selecciona item aleatorio para widget |
| **notificationService.js** | Selecciona item y envía notificación |
| **messageHandler.js** | Recibe clicks y coordina el registro |
| **progressService.js** | Crea/actualiza logs en la BD |
| **storage.js** | Guarda/recupera item.id en Chrome Storage |
| **content.js** | UI que detecta clicks de usuario |

---

## ⭐ Punto Crítico: De dónde sale el `item.id`

**Respuesta:** De **Chrome Storage** (línea 48 en `messageHandler.js`)

```javascript
// En messageHandler.js (línea 48)
const currentNotificationItem = await getCurrentItem(); // ← Obtiene item.id
if (!currentNotificationItem?.id) {
  console.warn('[background] onMessage: no currentNotificationItem');
  return;
}

await recordAttempt(currentNotificationItem.id, buttonIndex); // ← Se usa aquí
```

El item completo fue guardado en Storage en `notificationService.js` línea 29, y se recupera cuando el usuario hace click para poder actualizar la BD correctamente.
