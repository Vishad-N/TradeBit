import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import TradeBitPage from './TradeBitPage.jsx'
import './tradebit.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TradeBitPage />
  </StrictMode>,
)
