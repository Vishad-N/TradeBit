import { Brand } from './Header.jsx'

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <Brand />
        <p>
          <strong>Disclaimer:</strong> TradeBit India is an educational platform only. We are not SEBI registered
          advisors or analysts. All content, charts, and analysis are for educational purposes. Trading involves
          significant financial risk.
        </p>
        <p>© {new Date().getFullYear()} Trade Bit. All rights reserved.</p>
      </div>
    </footer>
  )
}
