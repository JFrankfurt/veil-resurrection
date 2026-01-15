import { Routes, Route } from 'react-router-dom'
import { Providers } from './providers'
import { Layout } from './components/Layout'
import { HomePage } from './pages/Home'
import { PortfolioPage } from './pages/Portfolio'
import { MarketDetailPage } from './pages/MarketDetail'

export function App() {
  return (
    <Providers>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/market/:address" element={<MarketDetailPage />} />
        </Routes>
      </Layout>
    </Providers>
  )
}
