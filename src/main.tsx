import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Toaster } from '@/components/ui/sonner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* low, above the tab bar: near the thumb, never over a title or the back button */}
    <Toaster position="bottom-center" offset={88} mobileOffset={{ bottom: 88 }} duration={2500}
      visibleToasts={1}
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
          actionButton: '!h-11 !rounded-4xl !px-4 !text-sm !font-bold',
          cancelButton: '!h-11 !rounded-4xl !border-2 !border-foreground !bg-card !px-4 !text-sm !font-bold !text-foreground',
        },
      }}
    />
  </StrictMode>,
)

// Makes the app installable on the phone (see public/sw.js: it caches nothing).
// Not in the demo: it must never install over the real app.
if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.MODE !== 'demo') {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
}
