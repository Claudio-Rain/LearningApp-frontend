# StudyView — Flujo y Algoritmo

## Flujo principal

```mermaid
flowchart TD
    A([onMounted]) --> B[Pull remoto si hay internet]
    B --> C[loadData]
    C --> D[Cargar colección + items + card progress]
    D --> E[Construir study queue\nordenada por strength_score ASC]
    E --> F[Mostrar primera carta]

    F --> G{¿Usuario voltea carta?}
    G -->|Click / Enter / Space| H[Mostrar respuesta]
    H --> I{¿Elige rating?}

    I -->|1 / Very Hard| J[easeScore = -0.15]
    I -->|2 / Hard| K[easeScore = -0.10]
    I -->|3 / Good| L[easeScore = +0.10]
    I -->|4 / Easy| M[easeScore = +0.15]

    J & K & L & M --> N[recordAttempt]

    N --> O[Crear AttemptLog\nis_correct = easeScore > 0]
    N --> P{¿Existe CardProgress?}

    P -->|Sí| Q[strength = clamp 0–1\nstrength + easeScore\ntotal_attempts++]
    P -->|No| R[Crear CardProgress\nstrength = max 0, easeScore]

    Q & R --> S[Sync remoto en background]
    S --> T[moveToNext]

    T --> U{¿Hay más cartas?}
    U -->|Sí| F
    U -->|No| V([Sesión completa → volver])
```

## Ordenamiento de la queue

```mermaid
flowchart LR
    A[Learning Items] --> B[Map con CardProgress]
    B --> C{Sort}
    C -->|1º| D[strength_score ASC\nmás débil primero]
    C -->|2º empate| E[last_reviewed_at ASC\nmenos revisado primero]
    C -->|3º empate| F[título alfabético]
    D & E & F --> G[Study Queue final]
```

## Escala de strength

```mermaid
graph LR
    A["0.0 – New\n(sin intentos)"]
    B["< 0.25 – Weak"]
    C["< 0.50 – Fair"]
    D["< 0.75 – Good"]
    E["≥ 0.75 – Mastered"]
    A --> B --> C --> D --> E
```

## Notas

- La queue se construye **una sola vez** al iniciar la sesión. Las cartas falladas no se re-encolan dentro de la misma sesión.
- `strength_score` está clampeado entre `0` y `1`.
- Se necesitan ~5 respuestas correctas consecutivas para pasar de 0 → 0.50 (Fair).
- El sync con el backend ocurre en background sin bloquear la UI.
