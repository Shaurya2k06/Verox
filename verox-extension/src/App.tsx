import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { 
  ShieldCheckIcon, 
  WalletIcon, 
  FingerPrintIcon, 
  EyeIcon,
  ClipboardIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  FireIcon,
  ClockIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { EtherscanService, type EtherscanBalance, type EtherscanTransaction } from './services/etherscan'
import './extension.css'

function App() {
  const [walletAddress] = useState('0x742d35Cc6634C0532925a3b8d0b4E1b87D5E2d3c')
  const [balance, setBalance] = useState<EtherscanBalance>({ eth: '0.000000', usd: '0.00' })
  const [transactions, setTransactions] = useState<EtherscanTransaction[]>([])
  const [gasPrice, setGasPrice] = useState('N/A')
  const [copied, setCopied] = useState(false)
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentView, setCurrentView] = useState<'main' | 'send' | 'receive'>('main')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  useEffect(() => {
    initializeApp()
  }, [])

  const initializeApp = async () => {
    // Initialize biometrics check
    try {
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        setBiometricSupported(available)
      }
    } catch (error) {
      console.log('Biometric check failed:', error)
    }

    // Load wallet data
    await loadWalletData()
  }

  const loadWalletData = async () => {
    setLoading(true)
    try {
      const [balanceData, transactionData, gasPriceData] = await Promise.all([
        EtherscanService.getBalance(walletAddress),
        EtherscanService.getTransactions(walletAddress, 3),
        EtherscanService.getGasPrice()
      ])
      
      setBalance(balanceData)
      setTransactions(transactionData)
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

  const handleReceive = async () => {
    setCurrentView('receive')
    await generateQRCode()
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
    if (!biometricSupported) {
      alert('Biometric authentication not supported')
      return
    }

    try {
      // Simple biometric authentication without relying party ID for localhost
      const challenge = crypto.getRandomValues(new Uint8Array(32))
      
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { 
            name: 'Verox Wallet'
            // Removed id to avoid domain issues in development
          },
          user: {
            id: crypto.getRandomValues(new Uint8Array(64)),
            name: 'verox.user',
            displayName: 'Verox User'
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          timeout: 60000,
          attestation: 'none'
        }
      })

      if (credential) {
        alert('✅ Biometric authentication successful!')
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        alert('❌ Biometric authentication cancelled or failed')
      } else if (error.name === 'NotSupportedError') {
        alert('❌ Biometric authentication not supported on this device')
      } else {
        alert('❌ Biometric authentication failed: Please try again')
        console.error('Biometric error:', error)
      }
    }
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
            <button className="btn-primary">
              Send ETH
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
      {/* Header */}
      <div className="header">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-lg">Verox</span>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="refresh-btn"
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="text-xs text-gray-400 mt-1">Secure Ethereum Wallet</div>
      </div>

      {/* Balance */}
      <div className="balance-card">
        <div className="flex items-center justify-center mb-2">
          <CurrencyDollarIcon className="w-8 h-8 text-purple-400" />
        </div>
        <div className="text-3xl font-bold text-center mb-1">{balance.eth} ETH</div>
        <div className="text-sm text-gray-400 text-center">≈ ${balance.usd} USD</div>
      </div>

      {/* Address */}
      <div className="address-section">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-xs text-gray-400 mb-1">Wallet Address</div>
            <div className="font-mono text-sm truncate text-gray-200">{walletAddress}</div>
          </div>
          <button 
            onClick={copyAddress}
            className="copy-btn"
          >
            {copied ? (
              <CheckCircleIcon className="w-4 h-4 text-green-400" />
            ) : (
              <ClipboardIcon className="w-4 h-4 text-purple-400" />
            )}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-row">
        <div className="stat-item">
          <FireIcon className="w-4 h-4 text-orange-400" />
          <span className="text-xs text-gray-400">Gas</span>
          <span className="text-xs font-medium text-gray-200">{gasPrice}</span>
        </div>
        <div className="stat-item">
          <ClockIcon className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-gray-400">Txns</span>
          <span className="text-xs font-medium text-gray-200">{transactions.length}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="actions-grid">
        <button className="action-btn" onClick={handleSend}>
          <WalletIcon className="w-5 h-5" />
          <span>Send</span>
        </button>
        <button className="action-btn" onClick={handleReceive}>
          <EyeIcon className="w-5 h-5" />
          <span>Receive</span>
        </button>
        <button 
          onClick={handleBiometricAuth}
          className={`action-btn ${!biometricSupported ? 'opacity-50' : ''}`}
          disabled={!biometricSupported}
        >
          <FingerPrintIcon className="w-5 h-5" />
          <span>{biometricSupported ? 'Touch ID' : 'No Touch ID'}</span>
        </button>
      </div>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <div className="transactions-section">
          <div className="text-sm font-medium text-gray-300 mb-2">Recent Activity</div>
          <div className="transactions-list">
            {transactions.slice(0, 2).map((tx) => (
              <div key={tx.hash} className="transaction-item">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs font-mono text-gray-400">
                      {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {tx.from.toLowerCase() === walletAddress.toLowerCase() ? 'Sent' : 'Received'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-medium ${
                      tx.from.toLowerCase() === walletAddress.toLowerCase() 
                        ? 'text-red-400' 
                        : 'text-green-400'
                    }`}>
                      {tx.from.toLowerCase() === walletAddress.toLowerCase() ? '-' : '+'}
                      {parseFloat(tx.value).toFixed(4)} ETH
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network Status */}
      <div className="network-status">
        <div className="status-item">
          <div className="status-dot status-connected"></div>
          <span className="text-xs text-gray-400">Ethereum Mainnet</span>
        </div>
      </div>
    </div>
  )
}

export default App
