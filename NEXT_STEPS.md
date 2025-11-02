# TutorAI - Next Steps & Implementation Guide

## Yang Sudah Dikerjakan (Week 1-2)

### Backend Infrastructure (100% Complete)

- PostgreSQL schema dengan pgvector extension
- JWT authentication system (register, login)
- Database connection pool setup
- Indexer service (PDF processing, chunking, embedding)
- RAG service (retrieval & Gemini integration)
- Chat API (send message, get history, delete)
- Admin APIs (users, documents, chats, stats)
- Rate limiting & security middleware
- Input validation dengan express-validator
- Error handling middleware
- File upload dengan Multer

### Frontend Core (75% Complete)

- Vite + React setup
- React Router dengan protected routes
- API client dengan axios & interceptors
- Auth pages (Login, Register)
- User chat interface
- Chat history page
- Admin dashboard (basic)
- Admin navigation
- ⏳ Admin pages (placeholder - perlu implementasi penuh)

## Yang Perlu Dikerjakan (Week 3-4)

### Priority 1: Setup & Testing (IMMEDIATE)

#### 1. Install Dependencies

```powershell
# Backend API
cd tutor-cerdas-api
npm install

# Indexer
cd ../indexer
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../trial-web
npm install
```

#### 2. Configure Environment Variables

Copy semua `.env.example` ke `.env` dan isi dengan credentials yang sesuai.

#### 3. Setup Database

```sql
-- Run schema
psql tutorai < database/schema.sql

-- Update default admin password
UPDATE profiles
SET password_hash = '$2b$10$...' -- Generate dengan bcrypt
WHERE email = 'admin@tutorai.com';
```

#### 4. Test Basic Flow

1. Start indexer: `uvicorn indexer_rag:app --reload`
2. Start backend: `npm run dev`
3. Start frontend: `npm run dev`
4. Test: Register → Login → Chat

### Priority 2: Complete Admin Features (Week 3, Day 1-2) COMPLETED

#### Admin Users Page (AdminUsers.jsx)

Fitur yang sudah diimplementasi:

- Table dengan daftar users (name, email, role, status)
- Search functionality
- Filter by role (user/admin) dan is_active
- Edit user (change role, toggle active status)
- Delete user dengan confirmation
- Pagination
- Responsive table design
- Loading & error states
- Modal untuk edit user
- Delete confirmation dialog

#### Admin Documents Page (AdminDocuments.jsx)

Fitur yang sudah diimplementasi:

- Upload PDF form dengan drag & drop
- Document list table (filename, status, size, chunks, date)
- Status badges (pending, processing, completed, failed)
- Re-index button untuk failed documents
- Delete document dengan confirmation
- Filter by status
- Pagination
- File size formatter
- Drag & drop upload area
- Loading & error states

#### Admin Chats Page (AdminChats.jsx)

Fitur yang sudah diimplementasi:

- Chat list dengan user info
- Filter by user, date range, keyword
- View full conversation detail
- Export to CSV functionality
- Delete chat
- Statistics (total chats, language distribution)
- Chat detail modal dengan sources
- Language badges (ID/EN)
- Date range filtering

### Priority 3: Advanced Features (Week 3, Day 3-5)

#### 3D Avatar Integration

File: `trial-web/src/components/Avatar.jsx`

Steps:

1. Install Three.js dependencies (sudah ada di package.json)
2. Download 3D model (.glb/.gltf) - Recommended: https://readyplayer.me/
3. Implement Avatar component:

```jsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

function AvatarModel({ animation }) {
  const { scene } = useGLTF("/models/avatar.glb");
  // Add animation logic here
  return <primitive object={scene} />;
}

export default function Avatar({ state = "idle" }) {
  return (
    <Canvas style={{ height: "300px" }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />
      <AvatarModel animation={state} />
      <OrbitControls />
    </Canvas>
  );
}
```

4. Integrate ke UserPage:

- Add Avatar component di sebelah chat
- State: idle (default), thinking (loading), talking (TTS active)

#### Speech-to-Text

File: `trial-web/src/components/SpeechToText.jsx`

Steps:

1. Check browser support for Web Speech API
2. Implement component:

```jsx
const SpeechToText = ({ onTranscript }) => {
  const recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();
  recognition.lang = "id-ID"; // Indonesian
  recognition.continuous = false;

  const startListening = () => {
    recognition.start();
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    onTranscript(transcript);
  };

  return <button onClick={startListening}> Speak</button>;
};
```

3. Integrate ke UserPage input box

#### Text-to-Speech

File: `trial-web/src/components/TextToSpeech.jsx`

Steps:

1. Implement TTS component:

```jsx
const TextToSpeech = ({ text, onStart, onEnd }) => {
  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.onstart = onStart;
    utterance.onend = onEnd;

    // Select Indonesian voice if available
    const voices = speechSynthesis.getVoices();
    const indonesianVoice = voices.find((v) => v.lang.startsWith("id"));
    if (indonesianVoice) utterance.voice = indonesianVoice;

    speechSynthesis.speak(utterance);
  };

  return <button onClick={speak}> Listen</button>;
};
```

2. Add to AI message bubbles
3. Sync with Avatar (talking animation)

### Priority 4: UI/UX Polish (Week 4, Day 1-2)

#### Responsive Design

- [ ] Test di mobile, tablet, desktop
- [ ] Adjust breakpoints di CSS
- [ ] Make sidebar collapsible on mobile
- [ ] Optimize chat interface for mobile

#### Loading States

- [ ] Skeleton loaders untuk data fetching
- [ ] Spinner animations
- [ ] Progress bars untuk file uploads
- [ ] Smooth transitions

#### Error Handling

- [ ] Friendly error messages
- [ ] Retry buttons
- [ ] Offline detection
- [ ] Connection error handling

### Priority 5: Testing (Week 4, Day 3-4)

#### Backend Testing

```powershell
# Test auth
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"test123"}'

# Test chat (need token)
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Apa itu AI?"}'
```

#### Frontend Testing

- [ ] User flow: Register → Login → Chat → History
- [ ] Admin flow: Login → Upload Doc → Monitor Chats
- [ ] Speech features: STT → Chat → TTS
- [ ] Error scenarios: Invalid login, network error, etc.

#### Integration Testing

- [ ] End-to-end: Upload PDF → Index → Ask question → Get answer with sources
- [ ] Multiple users chatting simultaneously
- [ ] Admin monitoring real-time chats
- [ ] Large PDF processing (100+ pages)

### Priority 6: Deployment (Week 4, Day 5)

#### Database (Choose one):

- **Railway**: https://railway.app/
- **Supabase** (PostgreSQL only): https://supabase.com/
- **ElephantSQL**: https://www.elephantsql.com/

#### Indexer Service:

- **Railway**: Support Python + PostgreSQL
- **Render**: Free tier available
- **Fly.io**: Good for Python apps

#### Backend API:

- **Railway**: Best option (easy PostgreSQL integration)
- **Render**: Free tier available
- **Fly.io**: Good performance

#### Frontend:

- **Vercel**: Best for React (recommended)
- **Netlify**: Alternative option
- **GitHub Pages**: Static only

#### Deployment Checklist:

- [ ] Set production environment variables
- [ ] Configure CORS untuk production domain
- [ ] Setup PostgreSQL dengan pgvector di cloud
- [ ] Deploy indexer service
- [ ] Deploy backend API
- [ ] Deploy frontend
- [ ] Test production flow
- [ ] Setup monitoring (optional: Sentry)

## Learning Resources

### Backend:

- Express.js: https://expressjs.com/
- PostgreSQL: https://www.postgresql.org/docs/
- Gemini API: https://ai.google.dev/docs

### Frontend:

- React: https://react.dev/
- React Router: https://reactrouter.com/
- Three.js: https://threejs.org/
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

## Success Criteria

Project dianggap sukses jika:

- User bisa register, login, chat dengan AI
- AI response menggunakan RAG (dengan source citations)
- Admin bisa upload PDF dan monitor users/chats
- Speech-to-text dan text-to-speech berfungsi
- 3D avatar responsive terhadap chat state
- Responsive di mobile dan desktop
- Deployed dan accessible via URL

## Troubleshooting Guide

### Common Issues:

1. **Database connection error**: Check DATABASE_URL format
2. **Gemini API error**: Verify API key, check quota
3. **pgvector error**: Make sure extension installed
4. **CORS error**: Configure CORS di backend
5. **Token expired**: Implement token refresh logic
6. **File upload fails**: Check file size limits & MIME types

## Team Coordination

### Frontend Team (Ucup Isya):

- Priority: Complete admin pages UI
- Secondary: Integrate 3D avatar & speech features
- Testing: User flows & responsive design

### Backend Team (Paci Hamam):

- Priority: Test all APIs thoroughly
- Secondary: Optimize RAG performance
- Testing: Load testing & error handling

### PM:

- Coordinate between teams
- Integration testing
- Deployment
- Documentation

## Launch Checklist (Nov 26, 2025)

Final checks sebelum launch:

- [ ] All features working
- [ ] All tests passing
- [ ] No console errors
- [ ] Responsive di semua devices
- [ ] Production deployment stable
- [ ] Documentation complete
- [ ] Default admin password changed
- [ ] Backup strategy in place
- [ ] Monitoring setup (optional)
- [ ] Demo video ready (optional)

---

**Good luck with the implementation! **

Jangan lupa untuk commit code secara berkala dan test setiap fitur sebelum melanjutkan ke yang berikutnya.

Target Launch: **November 26, 2025**
