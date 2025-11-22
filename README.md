# JoinUs Chat Server

Real-time chat server for JoinUs video conferencing platform using Socket.IO and Firebase Firestore.

## Features

- ✅ Real-time chat messaging
- ✅ Meeting room management (2-10 users)
- ✅ Firestore persistence
- ✅ Socket.IO WebSocket communication
- ✅ CORS support for Vercel deployment
- ✅ TypeScript with strict typing

## Tech Stack

- **Node.js** + **Express**
- **Socket.IO** for real-time communication
- **Firebase Admin SDK** for Firestore
- **TypeScript** for type safety

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="your-private-key"
```

## Development

```bash
npm run dev
```

## Production Build

```bash
npm run build
npm start
```

## API Endpoints

### HTTP Endpoints

#### Create Meeting
```
POST /api/meetings/create
Body: { createdBy: string, creatorName: string }
Response: { success: true, meetingId: string, meeting: Meeting }
```

#### Get Meeting Info
```
GET /api/meetings/:meetingId
Response: { success: true, participantCount: number, participants: Participant[] }
```

### Socket.IO Events

#### Client → Server

- **join-meeting**: Join a meeting room
  ```typescript
  { meetingId: string, uid: string, name: string }
  ```

- **send-message**: Send a chat message
  ```typescript
  { meetingId: string, text: string }
  ```

#### Server → Client

- **joined-meeting**: Confirmation of joining
  ```typescript
  { meetingId: string, participants: Participant[], messages: ChatMessage[] }
  ```

- **user-joined**: Another user joined
  ```typescript
  { uid: string, name: string, participantCount: number }
  ```

- **user-left**: User left the meeting
  ```typescript
  { name: string, participantCount: number }
  ```

- **new-message**: New chat message
  ```typescript
  { id: string, userId: string, userName: string, text: string, timestamp: Date }
  ```

- **join-error**: Error joining meeting
  ```typescript
  { message: string }
  ```

- **error**: General error
  ```typescript
  { message: string }
  ```

## Firestore Structure

### meetings Collection

```typescript
{
  meetingId: string,          // 6-digit ID
  createdBy: string,          // User UID
  createdAt: Timestamp,
  participants: [
    {
      uid: string,
      name: string,
      socketId: string,
      joinedAt: Date
    }
  ],
  messages: [
    {
      id: string,
      userId: string,
      userName: string,
      text: string,
      timestamp: Date
    }
  ],
  isActive: boolean,
  maxParticipants: number     // Default: 10
}
```

## Deployment to Render

1. Push code to GitHub repository
2. Create new Web Service on Render
3. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add all from `.env`
4. Deploy

## License

ISC
