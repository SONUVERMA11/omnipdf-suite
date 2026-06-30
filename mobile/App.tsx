import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { cacheDirectory, moveAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import {
  Camera as CameraIcon,
  FileText,
  Share2,
  Trash2,
  ChevronLeft,
  Settings,
  Zap,
  Info,
  Layers,
  Smartphone
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Screen = 'home' | 'scanner' | 'viewer';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [flash, setFlash] = useState<'off' | 'on'>('off');

  // Camera Setup
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (currentScreen === 'scanner' && !hasPermission) {
      requestPermission();
    }
  }, [currentScreen]);

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePhoto({
          flash: flash,
        });
        setScannedImages(prev => [...prev, `file://${photo.path}`]);
        Alert.alert('Success', 'Page scanned successfully!');
      } catch (err) {
        Alert.alert('Error', 'Failed to take photo: ' + String(err));
      }
    } else {
      // Simulation mode (Fallback for emulators or web)
      simulateCapture();
    }
  };

  const simulateCapture = () => {
    // Generate a mock scanned document image
    const mockImages = [
      'https://images.unsplash.com/photo-1586075010923-2dd45e9b2d4f?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop'
    ];
    const randomImg = mockImages[scannedImages.length % mockImages.length];
    setScannedImages(prev => [...prev, randomImg]);
    Alert.alert('Mock Scan', 'Simulated page capture successful!');
  };

  const deleteScan = (index: number) => {
    setScannedImages(prev => prev.filter((_, i) => i !== index));
  };

  const generateAndSharePDF = async () => {
    if (scannedImages.length === 0) return;
    setGeneratingPdf(true);
    try {
      // Build HTML template with base64 images or remote URLs
      const imgTags = scannedImages.map(img => 
        `<div style="page-break-after: always; display: flex; justify-content: center; align-items: center; height: 100vh; padding: 20px;">
          <img src="${img}" style="max-width: 100%; max-height: 100%; object-fit: contain; border: 1px solid #ddd;" />
         </div>`
      ).join('');

      const htmlContent = `
        <html>
          <head>
            <style>
              body { margin: 0; padding: 0; background-color: #ffffff; }
              @page { size: A4; margin: 0; }
            </style>
          </head>
          <body>
            ${imgTags}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
      });

      // Rename / move if needed, then share
      const newUri = (cacheDirectory || '') + `OmniPDF_Scan_${Date.now()}.pdf`;
      await moveAsync({
        from: uri,
        to: newUri
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri);
      } else {
        Alert.alert('Saved', `PDF saved locally to ${newUri}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to generate PDF: ' + String(err));
    } finally {
      setGeneratingPdf(false);
    }
  };

  const VisionCamera = Camera as any;

  // Views rendering
  return (
    <SafeAreaView style={styles.appContainer}>
      <StatusBar style="light" />

      {/* Screen 1: Home Dashboard */}
      {currentScreen === 'home' && (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoSquare}>
                <Layers size={20} color="white" />
              </View>
              <Text style={styles.logoText}>OmniPDF Mobile</Text>
            </View>
            <TouchableOpacity style={styles.iconButton}>
              <Settings size={20} color="#8e8e93" />
            </TouchableOpacity>
          </View>

          {/* Hero Banner */}
          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Zap size={10} color="#30d158" />
              <Text style={styles.heroBadgeText}>100% LOCAL PROCESSING</Text>
            </View>
            <Text style={styles.heroTitle}>Scan Documents on the Go</Text>
            <Text style={styles.heroSubtitle}>
              Transform paper documents into clean, sharing-ready PDF files instantly.
            </Text>
            <TouchableOpacity 
              style={styles.heroButton}
              onPress={() => setCurrentScreen('scanner')}
            >
              <CameraIcon size={16} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.heroButtonText}>Start New Scan</Text>
            </TouchableOpacity>
          </View>

          {/* Tools Grid */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.grid}>
            <TouchableOpacity 
              style={styles.gridCard}
              onPress={() => setCurrentScreen('scanner')}
            >
              <View style={[styles.gridIconContainer, { backgroundColor: 'rgba(0,122,255,0.15)' }]}>
                <CameraIcon size={22} color="#007aff" />
              </View>
              <Text style={styles.gridCardTitle}>Camera Scanner</Text>
              <Text style={styles.gridCardDesc}>Scan via phone camera</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.gridCard}
              onPress={() => {
                if (scannedImages.length > 0) {
                  setCurrentScreen('viewer');
                } else {
                  Alert.alert('No Scans', 'Please capture some pages first.');
                }
              }}
            >
              <View style={[styles.gridIconContainer, { backgroundColor: 'rgba(142,142,147,0.15)' }]}>
                <FileText size={22} color="#8e8e93" />
              </View>
              <Text style={styles.gridCardTitle}>View Scans</Text>
              <Text style={styles.gridCardDesc}>
                {scannedImages.length === 0 ? 'No active scans' : `${scannedImages.length} pages captured`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyBox}>
            <Info size={16} color="#8e8e93" style={{ marginRight: 10 }} />
            <Text style={styles.privacyText}>
              Your files never leave your device. All image-to-PDF operations run completely offline.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Designed by SONU VERMA</Text>
            <Text style={styles.footerLink}>github.com/sonuverma11</Text>
          </View>
        </ScrollView>
      )}

      {/* Screen 2: Document Scanner */}
      {currentScreen === 'scanner' && (
        <View style={styles.scannerContainer}>
          {/* Top Bar */}
          <View style={styles.scannerTopBar}>
            <TouchableOpacity 
              style={styles.scannerCloseButton}
              onPress={() => setCurrentScreen('home')}
            >
              <ChevronLeft size={24} color="white" />
              <Text style={styles.scannerCloseText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Viewfinder</Text>
            <TouchableOpacity 
              style={styles.flashButton}
              onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')}
            >
              <Zap size={20} color={flash === 'on' ? '#ffd60a' : '#8e8e93'} />
            </TouchableOpacity>
          </View>

          {/* Camera Viewfinder */}
          <View style={styles.viewfinderWrapper}>
            {hasPermission && device ? (
              <VisionCamera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={currentScreen === 'scanner'}
              />
            ) : (
              <View style={styles.cameraPlaceholder}>
                <Smartphone size={48} color="#2c2c2e" />
                <Text style={styles.placeholderText}>Camera Viewfinder Simulator</Text>
                <Text style={styles.placeholderSubtext}>Running on emulator/device</Text>
              </View>
            )}
            
            {/* Target overlay guide */}
            <View style={styles.overlayFrame} />
            
            {/* Live Page counter */}
            <View style={styles.pageBadge}>
              <Text style={styles.pageBadgeText}>{scannedImages.length} Pages Scanned</Text>
            </View>
          </View>

          {/* Bottom Control Bar */}
          <View style={styles.scannerBottomBar}>
            <TouchableOpacity 
              style={[styles.scannerThumbnailBtn, { opacity: scannedImages.length > 0 ? 1 : 0.3 }]}
              disabled={scannedImages.length === 0}
              onPress={() => setCurrentScreen('viewer')}
            >
              {scannedImages.length > 0 ? (
                <Image source={{ uri: scannedImages[scannedImages.length - 1] }} style={styles.scannerThumbnail} />
              ) : (
                <FileText size={24} color="white" />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.shutterButton}
              onPress={handleCapture}
            >
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            {scannedImages.length > 0 ? (
              <TouchableOpacity 
                style={styles.doneButton}
                onPress={() => setCurrentScreen('viewer')}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 60 }} />
            )}
          </View>
        </View>
      )}

      {/* Screen 3: Viewer / Edit Scanned PDF */}
      {currentScreen === 'viewer' && (
        <View style={styles.viewerContainer}>
          {/* Header */}
          <View style={styles.viewerHeader}>
            <TouchableOpacity 
              style={styles.viewerBackButton}
              onPress={() => setCurrentScreen('scanner')}
            >
              <ChevronLeft size={24} color="white" />
              <Text style={styles.viewerBackText}>Retake</Text>
            </TouchableOpacity>
            <Text style={styles.viewerTitle}>Scanned Pages</Text>
            <View style={{ width: 80 }} />
          </View>

          {/* Horizontal Swiper / List */}
          <ScrollView contentContainerStyle={styles.viewerScroll}>
            {scannedImages.map((uri, index) => (
              <View key={index} style={styles.pageCard}>
                <Image source={{ uri }} style={styles.pageImage} />
                <View style={styles.pageCardFooter}>
                  <Text style={styles.pageNumberLabel}>Page {index + 1}</Text>
                  <TouchableOpacity 
                    style={styles.deletePageBtn}
                    onPress={() => deleteScan(index)}
                  >
                    <Trash2 size={16} color="#ff453a" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Action Row */}
          <View style={styles.viewerFooter}>
            <TouchableOpacity 
              style={styles.addPagesBtn}
              onPress={() => setCurrentScreen('scanner')}
            >
              <CameraIcon size={16} color="#007aff" style={{ marginRight: 6 }} />
              <Text style={styles.addPagesBtnText}>Add Page</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.compileBtn}
              onPress={generateAndSharePDF}
              disabled={generatingPdf}
            >
              {generatingPdf ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Share2 size={16} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.compileBtnText}>Share PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoSquare: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: -0.5,
  },
  iconButton: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: '#1c1c1e',
  },
  heroCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    marginBottom: 30,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48,209,88,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    marginBottom: 14,
  },
  heroBadgeText: {
    color: '#30d158',
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#8e8e93',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007aff',
    paddingVertical: 12,
    borderRadius: 12,
  },
  heroButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 15,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  gridIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridCardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  gridCardDesc: {
    color: '#8e8e93',
    fontSize: 11,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  privacyText: {
    color: '#8e8e93',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    color: '#3a3a3c',
    fontSize: 12,
    fontWeight: '600',
  },
  footerLink: {
    color: '#1c1c1e',
    fontSize: 10,
    marginTop: 4,
  },

  // Scanner Screen styles
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
  },
  scannerCloseButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scannerCloseText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 4,
  },
  scannerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  flashButton: {
    padding: 8,
  },
  viewfinderWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cameraPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
  },
  placeholderSubtext: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 4,
  },
  overlayFrame: {
    position: 'absolute',
    width: '80%',
    height: '70%',
    borderWidth: 2,
    borderColor: 'rgba(0,122,255,0.6)',
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  pageBadge: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  pageBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  scannerBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    height: 120,
  },
  scannerThumbnailBtn: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    backgroundColor: '#1c1c1e',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  scannerThumbnail: {
    width: '100%',
    height: '100%',
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ffffff',
  },
  doneButton: {
    backgroundColor: '#007aff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  doneButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Viewer Screen styles
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
  },
  viewerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewerBackText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 4,
  },
  viewerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  viewerScroll: {
    padding: 20,
    gap: 20,
  },
  pageCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  pageImage: {
    width: '100%',
    height: 350,
    borderRadius: 10,
    resizeMode: 'contain',
    backgroundColor: '#000000',
  },
  pageCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  pageNumberLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  deletePageBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,69,58,0.1)',
  },
  viewerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#1c1c1e',
    backgroundColor: '#000000',
  },
  addPagesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#007aff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addPagesBtnText: {
    color: '#007aff',
    fontWeight: '600',
    fontSize: 15,
  },
  compileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007aff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    marginLeft: 12,
  },
  compileBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});
