import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BlurFade } from '@/components/ui/blur-fade';
import { 
  WalletIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  FingerPrintIcon
} from '@heroicons/react/24/outline';

interface WalletSetupProps {
  onWalletCreated: (address: string) => void;
}

export function WalletSetup({ onWalletCreated }: WalletSetupProps) {
  const [step, setStep] = useState<'welcome' | 'create' | 'import'>('welcome');
  const [loading, setLoading] = useState(false);

  const handleCreateWallet = async () => {
    setLoading(true);
    try {
      // Simulate wallet creation
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockAddress = '0x' + Math.random().toString(16).substr(2, 40);
      onWalletCreated(mockAddress);
    } catch (error) {
      console.error('Error creating wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportWallet = async () => {
    setLoading(true);
    try {
      // Simulate wallet import
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockAddress = '0x' + Math.random().toString(16).substr(2, 40);
      onWalletCreated(mockAddress);
    } catch (error) {
      console.error('Error importing wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'welcome') {
    return (
      <BlurFade delay={0.1} inView>
        <div className="extension-welcome">
          <div className="text-center mb-6">
            <WalletIcon className="w-16 h-16 mx-auto mb-3" />
            <h1 className="text-xl font-bold mt-3 mb-2">Welcome to Verox</h1>
            <p className="text-sm text-muted-foreground">
              Secure Ethereum wallet with biometric authentication
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => setStep('create')} 
              className="w-full h-12"
              disabled={loading}
            >
              <SparklesIcon className="w-4 h-4 mr-2" />
              Create New Wallet
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setStep('import')} 
              className="w-full h-12"
              disabled={loading}
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Import Existing Wallet
            </Button>
          </div>
        </div>
      </BlurFade>
    );
  }

  if (step === 'create') {
    return (
      <BlurFade delay={0.1} inView>
        <div className="extension-form">
          <div className="text-center mb-6">
            <SparklesIcon className="w-12 h-12 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mt-3 mb-2">Create New Wallet</h2>
            <p className="text-sm text-muted-foreground">
              Your wallet will be secured with biometric authentication
            </p>
          </div>

          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <FingerPrintIcon className="w-6 h-6" />
                <div>
                  <div className="text-sm font-medium">Biometric Security</div>
                  <div className="text-xs text-muted-foreground">
                    Touch ID will be used to unlock your wallet
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button 
              onClick={handleCreateWallet} 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating Wallet...' : 'Create Wallet'}
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => setStep('welcome')} 
              className="w-full"
              disabled={loading}
            >
              Back
            </Button>
          </div>
        </div>
      </BlurFade>
    );
  }

  if (step === 'import') {
    return (
      <BlurFade delay={0.1} inView>
        <div className="extension-form">
          <div className="text-center mb-6">
            <ArrowDownTrayIcon className="w-12 h-12 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mt-3 mb-2">Import Wallet</h2>
            <p className="text-sm text-muted-foreground">
              Import your existing wallet using seed phrase
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs text-muted-foreground">Seed Phrase</label>
              <textarea 
                className="w-full p-3 text-sm border rounded-md mt-1 min-h-20"
                placeholder="Enter your 12 or 24 word seed phrase..."
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleImportWallet} 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Importing Wallet...' : 'Import Wallet'}
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => setStep('welcome')} 
              className="w-full"
              disabled={loading}
            >
              Back
            </Button>
          </div>
        </div>
      </BlurFade>
    );
  }

  return null;
}
