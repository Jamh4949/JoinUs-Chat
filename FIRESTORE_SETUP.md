# Configuración de Firestore para JoinUs

## Crear la Colección `meetings` en Firestore

### Opción 1: Desde la Consola de Firebase (Recomendado)

1. **Ir a Firebase Console:**
   - Abre [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Selecciona tu proyecto `joiinus`

2. **Navegar a Firestore:**
   - En el menú lateral, haz clic en **"Firestore Database"**
   - Si es la primera vez, haz clic en **"Create database"**
   - Selecciona **"Start in production mode"** o **"Start in test mode"** (recomendado para desarrollo)
   - Elige la ubicación más cercana (ej: `us-central1`)

3. **Crear la colección `meetings`:**
   - Haz clic en **"Start collection"**
   - Nombre de la colección: `meetings`
   - Document ID: Puedes dejarlo en blanco por ahora o crear un documento de ejemplo
   
4. **Documento de ejemplo (opcional):**
   ```
   Document ID: 123456
   
   Campos:
   - meetingId: "123456" (string)
   - createdBy: "test-user-uid" (string)
   - createdAt: (timestamp) - haz clic en "Add field" → selecciona "timestamp"
   - participants: [] (array)
   - messages: [] (array)
   - isActive: true (boolean)
   - maxParticipants: 10 (number)
   ```

5. **Guardar:**
   - Haz clic en **"Save"**

### Opción 2: Se Creará Automáticamente

La colección `meetings` se creará automáticamente cuando el servidor de chat cree la primera reunión. No necesitas hacer nada manualmente si prefieres esta opción.

## Reglas de Seguridad de Firestore

Para desarrollo, puedes usar estas reglas (en la pestaña "Rules" de Firestore):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Meetings collection
    match /meetings/{meetingId} {
      // Allow read if authenticated
      allow read: if request.auth != null;
      
      // Allow create if authenticated
      allow create: if request.auth != null;
      
      // Allow update if authenticated (for adding participants/messages)
      allow update: if request.auth != null;
      
      // Allow delete only by meeting creator
      allow delete: if request.auth != null && 
                       resource.data.createdBy == request.auth.uid;
    }
    
    // Users collection (ya existente)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Para producción, deberías usar reglas más estrictas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /meetings/{meetingId} {
      // Only allow read if user is a participant
      allow read: if request.auth != null && 
                     request.auth.uid in resource.data.participants.map(p => p.uid);
      
      // Allow create if authenticated
      allow create: if request.auth != null &&
                       request.resource.data.createdBy == request.auth.uid;
      
      // Allow update only to add yourself as participant or add messages
      allow update: if request.auth != null;
      
      // Only creator can delete
      allow delete: if request.auth != null && 
                       resource.data.createdBy == request.auth.uid;
    }
  }
}
```

## Índices de Firestore (Opcional pero Recomendado)

Si planeas hacer consultas complejas, crea estos índices:

1. **Índice para meetings activas:**
   - Colección: `meetings`
   - Campos:
     - `isActive` (Ascending)
     - `createdAt` (Descending)

2. **Índice para meetings por usuario:**
   - Colección: `meetings`
   - Campos:
     - `createdBy` (Ascending)
     - `createdAt` (Descending)

Estos índices se pueden crear desde la consola de Firebase en la pestaña **"Indexes"** de Firestore.

## Verificar la Configuración

Una vez configurado, puedes verificar que todo funciona:

1. Inicia el servidor de chat:
   ```bash
   cd JoinUs-Chat
   npm install
   npm run dev
   ```

2. Deberías ver en la consola:
   ```
   ✅ Firebase Admin initialized successfully
   🚀 JoinUs Chat Server running on port 3001
   ```

3. Si hay algún error con Firebase, revisa:
   - Las credenciales en el archivo `.env`
   - Que el proyecto `joiinus` existe en Firebase
   - Que Firestore está habilitado

## Estructura de Datos Final

```
meetings (collection)
  └── {meetingId} (document)
      ├── meetingId: string (6 dígitos)
      ├── createdBy: string (UID del creador)
      ├── createdAt: timestamp
      ├── participants: array
      │   └── [
      │       {
      │         uid: string,
      │         name: string,
      │         socketId: string,
      │         joinedAt: timestamp
      │       }
      │     ]
      ├── messages: array
      │   └── [
      │       {
      │         id: string,
      │         userId: string,
      │         userName: string,
      │         text: string,
      │         timestamp: timestamp
      │       }
      │     ]
      ├── isActive: boolean
      └── maxParticipants: number (10)
```

## Notas Importantes

- **No necesitas crear documentos manualmente** - El servidor los creará automáticamente
- **La colección puede estar vacía al inicio** - Esto es normal
- **Los documentos se eliminarán automáticamente** cuando `isActive` sea `false` (puedes configurar esto con Cloud Functions si lo deseas)
