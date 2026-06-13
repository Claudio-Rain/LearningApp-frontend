# Sync Architecture

## Flow

```mermaid
flowchart TD
    T1[window 'online' event] --> SA
    T2[CollectionList onMounted] --> SA
    T3[StudyProgress sync button] --> SA
    T4[StudyView onMounted] --> SE[startSyncEngine]
    SE --> SA

    CRUD[After CRUD\nadd / edit / delete] --> SI[sync individual\nsyncCollections\nsyncLearningItems\nsyncCardProgress\nsyncAttemptLogs]

    SA[syncAll\nonline check]

    SA --> PULL
    SA --> PUSH

    subgraph PULL [Pull Phase — remote → local]
        P1[pullCollections]
        P2[pullAllLearningItems\n└ pullLearningItems per collection]
        P3[pullCardProgress]
        P4[pullAttemptLogs]
        P5[pullExcludedItems]
        P6[pullContentWidget]
    end

    subgraph PUSH [Push Phase — local pending → remote]
        S1[syncCollections]
        S2[syncLearningItems]
        S3[syncCardProgress]
        S4[syncAttemptLogs]
        S5[syncExcludedItems]
        S6[pushContentWidget]
    end
```

## Single Record Lifecycle

```mermaid
flowchart LR
    U[User action] --> L[Write local\nIndexedDB\nsyncStatus: pending]
    L --> R[Push to Firestore]
    R -- success --> SY[syncStatus: synced]
    R -- error --> ER[syncStatus: error]
    ER -- next syncAll --> R
    PULL2[Pull from remote] --> UD[undefined\nread-only local]
```

## syncStatus Lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending : local write
    pending --> synced : push ok
    pending --> error : push failed
    error --> synced : retry ok
    error --> error : retry failed
    [*] --> undefined : pulled from remote
```

## Conflict Resolution Rules

| Entity | Field used | Winner |
|---|---|---|
| Collections | `lastModified` | Remote if newer, skip if local pending |
| LearningItems | `lastModified` | Remote if newer, cascading delete if missing |
| CardProgress | `last_reviewed_at` | Remote if newer, skip if local pending |
| AttemptLogs | `created_at` | Append-only, insert if missing |
| ExcludedItems | `lastModified` | Remote if newer, cascading delete if missing |
| ContentWidget | `lastModified` | If local pending → push instead of pull |

## Known Issues

- `startSyncEngine()` only called in **StudyView** — `window 'online'` listener is never registered if user never visits study
- `stopSyncEngine()` is defined but **never called** — listener leaks if StudyView mounts multiple times
- Pull button in CollectionItemView only pulls `learningItems` for that collection, not a full sync
