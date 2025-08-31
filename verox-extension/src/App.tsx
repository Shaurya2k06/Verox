import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { 
  FingerPrintIcon, 
  ClipboardIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  FireIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { EtherscanService, type EtherscanBalance } from './services/etherscan'
import { walletService } from './services/wallet'
import { priceService, type CryptoPrices } from './services/price'
import './extension.css'

function App() {
  const [walletAddress, setWalletAddress] = useState('0x742d35Cc6634C0532925a3b8d0b4E1b87D5E2d3c')
  const [balance, setBalance] = useState<EtherscanBalance>({ eth: '0.000000', usd: '0.00' })
  const [gasPrice, setGasPrice] = useState('N/A')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentView, setCurrentView] = useState<'main' | 'send' | 'receive'>('main')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [sendAmount, setSendAmount] = useState('')
  const [sendAddress, setSendAddress] = useState('')
  const [sending, setSending] = useState(false)
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({ ETH: 0, BTC: 0, USDC: 0 })
  const [portfolioValue, setPortfolioValue] = useState<number>(0)

  useEffect(() => {
    initializeApp()
  }, [])

  useEffect(() => {
    if (currentView === 'receive' && !qrCodeUrl) {
      generateQRCode()
    }
  }, [currentView, qrCodeUrl])

  const initializeApp = async () => {
    setLoading(true)
    
    try {
      // Get current crypto prices
      const prices = await priceService.getCurrentPrices()
      setCryptoPrices(prices)
      
      // Check if wallet exists in storage
      const storedAddress = await walletService.getStoredWallet()
      
      if (storedAddress) {
        setWalletAddress(storedAddress)
        
        // Try to unlock existing wallet
        const unlockResult = await walletService.unlockWallet()
        if (unlockResult.success && unlockResult.data) {
          const ethBalance = unlockResult.data.balance || '0.000000'
          setBalance({ 
            eth: ethBalance, 
            usd: (parseFloat(ethBalance) * prices.ETH).toFixed(2)
          })
          
          // Calculate portfolio value
          const portfolio = await priceService.getPortfolioValue({
            ETH: ethBalance,
            BTC: '0.001', // Mock BTC balance
            USDC: '100' // Mock USDC balance
          })
          setPortfolioValue(portfolio)
        }
      } else {
        // No wallet found, create a new one
        const createResult = await walletService.createWallet()
        if (createResult.success && createResult.data) {
          setWalletAddress(createResult.data.address)
          setBalance({ 
            eth: createResult.data.balance, 
            usd: '0.00'
          })
        }
      }
      
      // Check biometric availability - this will be handled by the wallet service
      
      // Load additional wallet data
      await loadWalletData()
    } catch (error) {
      console.error('App initialization error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadWalletData = async () => {
    setLoading(true)
    try {
      const [balanceData, gasPriceData] = await Promise.all([
        EtherscanService.getBalance(walletAddress),
        EtherscanService.getGasPrice()
      ])
      
      setBalance(balanceData)
      setGasPrice(gasPriceData)
    } catch (error) {
      console.error('Error loading wallet data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadWalletData()
  }

  const handleSend = () => {
    setCurrentView('send')
  }

  const handleBackToMain = () => {
    setCurrentView('main')
  }

  const generateQRCode = async () => {
    try {
      const qrDataURL = await QRCode.toDataURL(walletAddress, {
        width: 180,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      setQrCodeUrl(qrDataURL)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const handleBiometricAuth = async () => {
    try {
      const result = await walletService.verifyBiometric()
      
      if (result.success && result.data) {
        if (result.data.verified) {
          alert(`✅ ${result.data.method} verification successful!`)
        } else {
          alert('❌ Biometric verification failed')
        }
      } else {
        alert(`⚠️ ${result.error || 'Biometric verification error'}`)
      }
    } catch (error) {
      console.error('Biometric auth error:', error)
      alert('❌ Biometric authentication failed')
    }
  }

  const handleSendTransaction = async () => {
    if (!sendAddress || !sendAmount) {
      alert('Please enter both address and amount')
      return
    }

    setSending(true)
    try {
      const result = await walletService.sendTransaction(sendAddress, sendAmount, gasPrice)
      
      if (result.success && result.data) {
        // Save transaction to local storage
        await walletService.saveTransaction(result.data.txHash, sendAddress, sendAmount)
        
        alert(`✅ Transaction sent!\nTx Hash: ${result.data.txHash.slice(0, 10)}...`)
        
        // Reset form and go back to main
        setSendAmount('')
        setSendAddress('')
        setCurrentView('main')
        
        // Refresh balance
        await loadWalletData()
      } else {
        alert(`❌ Transaction failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Send transaction error:', error)
      alert('❌ Transaction failed')
    } finally {
      setSending(false)
    }
  }

  const handleBuyEth = () => {
    // Open a buy ETH page - for now just show an alert
    alert('🚀 Buy ETH feature coming soon!\n\nYou can buy ETH on exchanges like Coinbase, Binance, or Uniswap.')
  }

  const handleSwapTokens = () => {
    // Open swap interface - for now just show an alert  
    alert('🔄 Token swap feature coming soon!\n\nYou will be able to swap between different cryptocurrencies.')
  }

  if (loading) {
    return (
      <div className="extension-container">
        <div className="flex items-center justify-center h-full">
          <ArrowPathIcon className="w-6 h-6 animate-spin text-purple-400" />
          <span className="ml-2 text-purple-300">Loading wallet...</span>
        </div>
      </div>
    )
  }

  // Send View
  if (currentView === 'send') {
    return (
      <div className="extension-container">
        {/* Send Header */}
        <div className="header">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <button onClick={handleBackToMain} className="back-btn">
                <ArrowLeftIcon className="w-4 h-4" />
              </button>
              <span className="font-bold text-lg">Send ETH</span>
            </div>
          </div>
        </div>

        {/* Send Form */}
        <div className="send-form">
          <div className="input-group">
            <label className="text-xs text-gray-400 mb-2">To Address</label>
            <input 
              type="text" 
              placeholder="0x..." 
              className="form-input"
              value={sendAddress}
              onChange={(e) => setSendAddress(e.target.value)}
            />
          </div>
          
          <div className="input-group">
            <label className="text-xs text-gray-400 mb-2">Amount</label>
            <div className="amount-input-container">
              <input 
                type="number" 
                placeholder="0.0" 
                step="0.000001"
                className="form-input"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
              />
              <span className="currency-label">ETH</span>
            </div>
          </div>

          <div className="balance-info">
            <div className="text-xs text-gray-400">
              Available: {balance.eth} ETH (${balance.usd})
            </div>
          </div>

          <div className="send-actions">
            <button onClick={handleBackToMain} className="btn-secondary">
              Cancel
            </button>
            <button 
              onClick={handleSendTransaction}
              className="btn-primary"
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send ETH'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Receive View
  if (currentView === 'receive') {
    return (
      <div className="extension-container">
        {/* Receive Header */}
        <div className="header">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <button onClick={handleBackToMain} className="back-btn">
                <ArrowLeftIcon className="w-4 h-4" />
              </button>
              <span className="font-bold text-lg">Receive ETH</span>
            </div>
          </div>
        </div>

        {/* Receive Content */}
        <div className="receive-content">
          <div className="qr-section">
            {qrCodeUrl ? (
              <div className="qr-code-container">
                <img src={qrCodeUrl} alt="Wallet QR Code" className="qr-code" />
                <div className="text-xs text-gray-400 text-center mt-2">
                  Scan to send ETH to this wallet
                </div>
              </div>
            ) : (
              <div className="qr-loading">
                <ArrowPathIcon className="w-6 h-6 animate-spin text-purple-400" />
                <div className="text-xs text-gray-400 mt-2">Generating QR Code...</div>
              </div>
            )}
          </div>

          <div className="address-copy-section">
            <label className="text-xs text-gray-400 mb-2">Your Wallet Address</label>
            <div className="address-copy-container">
              <div className="address-display-full">
                <span className="font-mono text-sm text-gray-200">{walletAddress}</span>
              </div>
              <button onClick={copyAddress} className="copy-btn-large">
                {copied ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-400" />
                ) : (
                  <ClipboardIcon className="w-5 h-5 text-purple-400" />
                )}
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-2 text-center">
              Copy address or scan QR code to receive ETH
            </div>
          </div>

          <div className="receive-actions">
            <button onClick={handleBackToMain} className="btn-primary">
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main View
  return (
    <div className="extension-container">
      {/* Top Header with Wallet Selector */}
      <div className="top-header">
        <div className="wallet-selector">
          <div className="wallet-icon"></div>
          <span className="wallet-name">Verox</span>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="header-action-btn"
        >
          <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Balance Display */}
      <div className="main-balance">
        <div className="balance-amount">${portfolioValue > 0 ? portfolioValue.toFixed(2) : balance.usd}</div>
        <button className="copy-address-btn" onClick={copyAddress}>
          copy address
          {copied ? (
            <CheckCircleIcon className="w-4 h-4 text-green-400" />
          ) : (
            <ClipboardIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Action Buttons Grid */}
      <div className="action-buttons">
        <button className="main-action-btn" onClick={handleBuyEth}>
          <div className="action-icon">
            <CurrencyDollarIcon className="w-6 h-6" />
          </div>
          <span>Buy</span>
        </button>
        <button className="main-action-btn" onClick={handleSend}>
          <div className="action-icon">
            <ArrowUpIcon className="w-6 h-6" />
          </div>
          <span>Send</span>
        </button>
        <button className="main-action-btn" onClick={handleSwapTokens}>
          <div className="action-icon">
            <ArrowsRightLeftIcon className="w-6 h-6" />
          </div>
          <span>Swap</span>
        </button>
      </div>

      {/* Your Tokens Section */}
      <div className="tokens-section">
        <div className="section-header">
          <h3>Your tokens</h3>
          <button className="search-btn">
            <MagnifyingGlassIcon className="w-4 h-4" />
          </button>
        </div>

        {/* ETH Token Display */}
        <div className="token-item">
          <div className="token-info">
            <div className="token-icon">
              <div className="eth-icon">Ξ</div>
            </div>
            <div className="token-details">
              <div className="token-name">ETH</div>
              <div className="token-amount">{balance.eth} ETH</div>
            </div>
          </div>
          <div className="token-value">
            <div className="token-usd">${balance.usd}</div>
            <div className="token-change">+0.40%</div>
          </div>
        </div>

        {/* BTC Token Display */}
        <div className="token-item">
          <div className="token-info">
            <div className="token-icon">
              <div className="btc-icon">₿</div>
            </div>
            <div className="token-details">
              <div className="token-name">BTC</div>
              <div className="token-amount">0.00125 BTC</div>
            </div>
          </div>
          <div className="token-value">
            <div className="token-usd">${(0.00125 * cryptoPrices.BTC).toFixed(2)}</div>
            <div className="token-change">+2.15%</div>
          </div>
        </div>

        {/* USDC Token Display */}
        <div className="token-item">
          <div className="token-info">
            <div className="token-icon">
              <div className="usdc-icon">$</div>
            </div>
            <div className="token-details">
              <div className="token-name">USDC</div>
              <div className="token-amount">250.00 USDC</div>
            </div>
          </div>
          <div className="token-value">
            <div className="token-usd">${(250 * cryptoPrices.USDC).toFixed(2)}</div>
            <div className="token-change">+0.01%</div>
          </div>
        </div>

        {/* Gas Price Info */}
        <div className="token-item">
          <div className="token-info">
            <div className="token-icon">
              <FireIcon className="w-5 h-5 text-orange-400" />
            </div>
            <div className="token-details">
              <div className="token-name">Gas Price</div>
              <div className="token-amount">{gasPrice}</div>
            </div>
          </div>
          <div className="token-value">
            <div className="token-usd">Network</div>
            <div className="token-change">Mainnet</div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <button className="nav-item active">
          <div className="nav-icon">🏠</div>
          <span>Home</span>
        </button>
        <button className="nav-item" onClick={handleBiometricAuth}>
          <div className="nav-icon">
            <FingerPrintIcon className="w-5 h-5" />
          </div>
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
}

export default App
