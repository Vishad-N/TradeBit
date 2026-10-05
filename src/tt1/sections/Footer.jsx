import { Brand } from './Header.jsx'

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <Brand />
        <p>
          Trading involves risk. Content is for education only and is not investment advice. Past performance does not
          guarantee future results.
        </p>
        <p>© {new Date().getFullYear()} Trade Bit. All rights reserved.</p>
      </div>
    </footer>
  )
}
