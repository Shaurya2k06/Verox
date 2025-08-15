import React, { useState, useEffect } from 'react'
import { WalletSetup } from './components/WalletSetup'
import { WalletDashboard } from './components/WalletDashboard'
import './App.css'

function App() {
  const [isSetup, setIsSetup] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if wallet is already set up
    chrome.storage.local.get(['wallet_address', 'wallet_setup'], (result) => {
      if (result.wallet_setup && result.wallet_address) {
        setIsSetup(true)
        setWalletAddress(result.wallet_address)
      }
      setLoading(false)
    })
  }, [])

  const handleWalletCreated = (address: string) => {
    setWalletAddress(address)
    setIsSetup(true)
    // Store in chrome storage
    chrome.storage.local.set({
      wallet_setup: true,
      wallet_address: address,
    })
  }

  const handleLogout = () => {
    setIsSetup(false)
    setWalletAddress(null)
    // Clear storage
    chrome.storage.local.remove(['wallet_setup', 'wallet_address'])
  }

  if (loading) {
    return (
      <div className="extension-container">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="extension-container">
      {!isSetup ? (
        <WalletSetup onWalletCreated={handleWalletCreated} />
      ) : (
        <WalletDashboard address={walletAddress!} onLogout={handleLogout} />
      )}
    </div>
  )
}

export default App
