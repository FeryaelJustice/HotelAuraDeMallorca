import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { CookiesProvider } from 'react-cookie';
import './index.css'
import "./lang/i18n";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <CookiesProvider defaultSetOptions={{ path: '/' }}>
    <App />
  </CookiesProvider>
)
