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
  Alert,
  TextInput,
  FlatList,
  Platform
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import {
  cacheDirectory,
  documentDirectory,
  moveAsync,
  readDirectoryAsync,
  deleteAsync,
  readAsStringAsync,
  writeAsStringAsync,
  getInfoAsync
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as DocumentPicker from 'expo-document-picker';
import { PDFDocument, degrees } from 'pdf-lib';
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
  Smartphone,
  Folder,
  User,
  Plus,
  RefreshCw,
  Scissors,
  Eye,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Files
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Tab = 'home' | 'tools' | 'vault' | 'developer';
type Screen = 'dashboard' | 'scanner' | 'viewer' | 'tool-merge' | 'tool-rotate' | 'tool-split' | 'tool-delete';

interface VaultFile {
  name: string;
  uri: string;
  size: string;
  createdAt: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  
  // Scans State
  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [flash, setFlash] = useState<'off' | 'on'>('off');

  // Vault Storage State
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
  const [refreshingVault, setRefreshingVault] = useState(false);

  // Tools Working States
  const [mergeFiles, setMergeFiles] = useState<{ name: string; uri: string }[]>([]);
  const [selectedToolFile, setSelectedToolFile] = useState<{ name: string; uri: string } | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(90);
  const [splitStart, setSplitStart] = useState<string>('1');
  const [splitEnd, setSplitEnd] = useState<string>('2');
  const [deletePageNums, setDeletePageNums] = useState<string>('');
  const [toolProcessing, setToolProcessing] = useState(false);

  // Camera Setup
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<any>(null);

  // Load vault files on start or tab changes
  useEffect(() => {
    loadVaultFiles();
  }, [activeTab]);

  const loadVaultFiles = async () => {
    if (!documentDirectory) return;
    setRefreshingVault(true);
    try {
      const files = await readDirectoryAsync(documentDirectory);
      const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
      
      const fileObjects = await Promise.all(
        pdfFiles.map(async name => {
          const uri = documentDirectory + name;
          const info = await getInfoAsync(uri);
          let sizeStr = '0 KB';
          let time = Date.now();
          if (info.exists) {
            const kb = Math.round(info.size / 1024);
            sizeStr = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
            time = info.modificationTime * 1000 || Date.now();
          }
          return { name, uri, size: sizeStr, createdAt: time };
        })
      );
      // Sort by newest first
      fileObjects.sort((a, b) => b.createdAt - a.createdAt);
      setVaultFiles(fileObjects);
    } catch (err) {
      console.error('Failed to load vault files:', err);
    } finally {
      setRefreshingVault(false);
    }
  };

  // Camera Capture Handlers
  const handleCapture = async () => {
    if (cameraRef.current && typeof cameraRef.current.takePhoto === 'function') {
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
      // Graceful fallback for simulator / Expo Go (where native modules aren't linked)
      Alert.alert(
        'Scanner Simulator',
        'Camera native modules are not loaded (common in Expo Go/emulators). Running in simulation mode.',
        [
          {
            text: 'Capture Simulation',
            onPress: () => simulateCapture()
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const simulateCapture = () => {
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

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const targetDir = documentDirectory || cacheDirectory || '';
      const finalUri = targetDir + `Scan_${Date.now()}.pdf`;
      
      await moveAsync({
        from: uri,
        to: finalUri
      });

      Alert.alert(
        'PDF Saved',
        'Your PDF has been saved successfully in the App Vault.',
        [
          {
            text: 'Share Now',
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(finalUri);
              }
            }
          },
          {
            text: 'View in Vault',
            onPress: () => {
              setCurrentScreen('dashboard');
              setActiveTab('vault');
              setScannedImages([]);
            }
          }
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to generate PDF: ' + String(err));
    } finally {
      setGeneratingPdf(false);
    }
  };

  // PDF-LIB Utility Actions

  // 1. Pick Files for Merging
  const pickMergeFiles = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true
      });
      if (res.canceled) return;
      
      const newFiles = res.assets.map(a => ({ name: a.name, uri: a.uri }));
      setMergeFiles(prev => [...prev, ...newFiles]);
    } catch (err) {
      Alert.alert('Error', 'Failed to pick files: ' + String(err));
    }
  };

  const reorderMergeFile = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= mergeFiles.length) return;
    
    const updated = [...mergeFiles];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;
    setMergeFiles(updated);
  };

  // 2. Perform Merging
  const runMergePDFs = async () => {
    if (mergeFiles.length < 2) {
      Alert.alert('Need more files', 'Please select at least 2 PDF files to merge.');
      return;
    }
    setToolProcessing(true);
    try {
      const mergedDoc = await PDFDocument.create();
      
      for (const file of mergeFiles) {
        const base64 = await readAsStringAsync(file.uri, { encoding: 'base64' });
        const docBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const subDoc = await PDFDocument.load(docBytes);
        const copiedPages = await mergedDoc.copyPages(subDoc, subDoc.getPageIndices());
        copiedPages.forEach(p => mergedDoc.addPage(p));
      }

      const mergedBase64 = await mergedDoc.saveAsBase64();
      const targetDir = documentDirectory || cacheDirectory || '';
      const finalUri = targetDir + `Merged_${Date.now()}.pdf`;
      await writeAsStringAsync(finalUri, mergedBase64, { encoding: 'base64' });

      Alert.alert('Success', 'PDF files merged successfully!', [
        { text: 'View Vault', onPress: () => { setMergeFiles([]); setCurrentScreen('dashboard'); setActiveTab('vault'); } }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to merge PDF files: ' + String(err));
    } finally {
      setToolProcessing(false);
    }
  };

  // 3. Pick File for Single Document Tools
  const pickSingleFileForTool = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (res.canceled) return;
      setSelectedToolFile({ name: res.assets[0].name, uri: res.assets[0].uri });
    } catch (err) {
      Alert.alert('Error', 'Failed to pick file: ' + String(err));
    }
  };

  // 4. Perform Rotation
  const runRotatePDF = async () => {
    if (!selectedToolFile) return;
    setToolProcessing(true);
    try {
      const base64 = await readAsStringAsync(selectedToolFile.uri, { encoding: 'base64' });
      const docBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const pdfDoc = await PDFDocument.load(docBytes);
      
      const pages = pdfDoc.getPages();
      pages.forEach(page => {
        const currentRot = page.getRotation().angle;
        page.setRotation(degrees((currentRot + rotationAngle) % 360));
      });

      const rotatedBase64 = await pdfDoc.saveAsBase64();
      const targetDir = documentDirectory || cacheDirectory || '';
      const finalUri = targetDir + `Rotated_${Date.now()}.pdf`;
      await writeAsStringAsync(finalUri, rotatedBase64, { encoding: 'base64' });

      Alert.alert('Success', 'PDF pages rotated successfully!', [
        { text: 'View Vault', onPress: () => { setSelectedToolFile(null); setCurrentScreen('dashboard'); setActiveTab('vault'); } }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Rotation failed: ' + String(err));
    } finally {
      setToolProcessing(false);
    }
  };

  // 5. Perform Split
  const runSplitPDF = async () => {
    if (!selectedToolFile) return;
    const start = parseInt(splitStart);
    const end = parseInt(splitEnd);

    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
      Alert.alert('Invalid Range', 'Please enter a valid page number range.');
      return;
    }

    setToolProcessing(true);
    try {
      const base64 = await readAsStringAsync(selectedToolFile.uri, { encoding: 'base64' });
      const docBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const originalDoc = await PDFDocument.load(docBytes);
      const pageCount = originalDoc.getPageCount();

      if (end > pageCount) {
        Alert.alert('Out of bounds', `Selected document has only ${pageCount} pages.`);
        setToolProcessing(false);
        return;
      }

      const splitDoc = await PDFDocument.create();
      // Pages array is 0-indexed
      const indicesToCopy = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
      const copiedPages = await splitDoc.copyPages(originalDoc, indicesToCopy);
      copiedPages.forEach(p => splitDoc.addPage(p));

      const splitBase64 = await splitDoc.saveAsBase64();
      const targetDir = documentDirectory || cacheDirectory || '';
      const finalUri = targetDir + `Split_${Date.now()}.pdf`;
      await writeAsStringAsync(finalUri, splitBase64, { encoding: 'base64' });

      Alert.alert('Success', 'PDF split successfully!', [
        { text: 'View Vault', onPress: () => { setSelectedToolFile(null); setCurrentScreen('dashboard'); setActiveTab('vault'); } }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Split failed: ' + String(err));
    } finally {
      setToolProcessing(false);
    }
  };

  // 6. Perform Deletion
  const runDeletePages = async () => {
    if (!selectedToolFile) return;
    if (!deletePageNums.trim()) {
      Alert.alert('Error', 'Please specify page numbers to remove.');
      return;
    }

    setToolProcessing(true);
    try {
      const base64 = await readAsStringAsync(selectedToolFile.uri, { encoding: 'base64' });
      const docBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const pdfDoc = await PDFDocument.load(docBytes);
      const pageCount = pdfDoc.getPageCount();

      // Parse e.g. "2, 4" into 0-indexed indices [1, 3]
      const indicesToRemove = deletePageNums
        .split(',')
        .map(num => parseInt(num.trim()) - 1)
        .filter(idx => !isNaN(idx) && idx >= 0 && idx < pageCount);

      if (indicesToRemove.length === 0) {
        Alert.alert('Invalid Pages', 'None of the input pages could be resolved.');
        setToolProcessing(false);
        return;
      }

      // Sort in descending order to prevent index shifts when deleting pages
      indicesToRemove.sort((a, b) => b - a);
      indicesToRemove.forEach(index => {
        pdfDoc.removePage(index);
      });

      const deletedBase64 = await pdfDoc.saveAsBase64();
      const targetDir = documentDirectory || cacheDirectory || '';
      const finalUri = targetDir + `Modified_${Date.now()}.pdf`;
      await writeAsStringAsync(finalUri, deletedBase64, { encoding: 'base64' });

      Alert.alert('Success', 'Selected pages deleted successfully!', [
        { text: 'View Vault', onPress: () => { setSelectedToolFile(null); setCurrentScreen('dashboard'); setActiveTab('vault'); } }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Deletion failed: ' + String(err));
    } finally {
      setToolProcessing(false);
    }
  };

  const deleteVaultFile = (uri: string) => {
    Alert.alert('Delete File', 'Are you sure you want to permanently delete this PDF?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAsync(uri);
            loadVaultFiles();
            Alert.alert('Deleted', 'File removed successfully.');
          } catch (err) {
            Alert.alert('Error', 'Failed to delete file.');
          }
        }
      }
    ]);
  };

  const shareVaultFile = async (uri: string) => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    } else {
      Alert.alert('Unavailable', 'Sharing is not supported on this platform.');
    }
  };

  const VisionCamera = Camera as any;

  return (
    <SafeAreaView style={styles.appContainer}>
      <StatusBar style="light" />

      {/* Main View Router */}
      {currentScreen === 'dashboard' && (
        <View style={{ flex: 1 }}>
          
          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              <View style={styles.header}>
                <View style={styles.logoRow}>
                  <View style={styles.logoSquare}>
                    <Layers size={18} color="white" />
                  </View>
                  <Text style={styles.logoText}>OmniPDF Mobile</Text>
                </View>
                <TouchableOpacity style={styles.iconButton} onPress={() => { setSelectedToolFile(null); setMergeFiles([]); setActiveTab('tools'); }}>
                  <Settings size={18} color="#8e8e93" />
                </TouchableOpacity>
              </View>

              {/* Glassmorphic Hero Banner */}
              <View style={styles.heroCard}>
                <View style={styles.heroBadge}>
                  <Zap size={10} color="#30d158" />
                  <Text style={styles.heroBadgeText}>OFFLINE UTILITIES</Text>
                </View>
                <Text style={styles.heroTitle}>Premium PDF Studio</Text>
                <Text style={styles.heroSubtitle}>
                  Scan documents, merge files, rotate layouts, and manage pages entirely client-side.
                </Text>
                <TouchableOpacity 
                  style={styles.heroButton}
                  onPress={() => {
                    setScannedImages([]);
                    setCurrentScreen('scanner');
                  }}
                >
                  <CameraIcon size={16} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.heroButtonText}>Open Document Scanner</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Actions Grid */}
              <Text style={styles.sectionTitle}>Quick Tools</Text>
              <View style={styles.grid}>
                <TouchableOpacity 
                  style={styles.gridCard}
                  onPress={() => {
                    setMergeFiles([]);
                    setCurrentScreen('tool-merge');
                  }}
                >
                  <View style={[styles.gridIconContainer, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
                    <Files size={20} color="#6366f1" />
                  </View>
                  <Text style={styles.gridCardTitle}>Merge PDFs</Text>
                  <Text style={styles.gridCardDesc}>Combine documents</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.gridCard}
                  onPress={() => {
                    setSelectedToolFile(null);
                    setCurrentScreen('tool-rotate');
                  }}
                >
                  <View style={[styles.gridIconContainer, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                    <RotateCw size={20} color="#8b5cf6" />
                  </View>
                  <Text style={styles.gridCardTitle}>Rotate Pages</Text>
                  <Text style={styles.gridCardDesc}>Change page angle</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.grid}>
                <TouchableOpacity 
                  style={styles.gridCard}
                  onPress={() => {
                    setSelectedToolFile(null);
                    setCurrentScreen('tool-split');
                  }}
                >
                  <View style={[styles.gridIconContainer, { backgroundColor: 'rgba(236,72,153,0.15)' }]}>
                    <Scissors size={20} color="#ec4899" />
                  </View>
                  <Text style={styles.gridCardTitle}>Split Pages</Text>
                  <Text style={styles.gridCardDesc}>Extract page ranges</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.gridCard}
                  onPress={() => {
                    setSelectedToolFile(null);
                    setCurrentScreen('tool-delete');
                  }}
                >
                  <View style={[styles.gridIconContainer, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                    <Trash2 size={20} color="#ef4444" />
                  </View>
                  <Text style={styles.gridCardTitle}>Delete Pages</Text>
                  <Text style={styles.gridCardDesc}>Remove target page</Text>
                </TouchableOpacity>
              </View>

              {/* Statistics & Security Banner */}
              <View style={styles.privacyBox}>
                <Info size={16} color="#8e8e93" style={{ marginRight: 10 }} />
                <Text style={styles.privacyText}>
                  Safe & Secure: All PDF tasks run locally. Your personal data is never transmitted to any cloud servers.
                </Text>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Developed by SONU VERMA</Text>
                <Text style={styles.footerLink}>github.com/sonuverma11</Text>
              </View>
            </ScrollView>
          )}

          {/* TAB 2: TOOLS PORTFOLIO */}
          {activeTab === 'tools' && (
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              <Text style={styles.viewTitleText}>PDF Editor Suite</Text>
              <Text style={styles.viewSubtitleText}>Advanced client-side compilation engines</Text>

              <TouchableOpacity style={styles.toolListCard} onPress={() => { setMergeFiles([]); setCurrentScreen('tool-merge'); }}>
                <View style={[styles.toolListIcon, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
                  <Files size={22} color="#6366f1" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.toolListTitle}>PDF Document Merger</Text>
                  <Text style={styles.toolListDesc}>Select multiple PDFs and merge them into one file.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.toolListCard} onPress={() => { setSelectedToolFile(null); setCurrentScreen('tool-rotate'); }}>
                <View style={[styles.toolListIcon, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                  <RotateCw size={22} color="#8b5cf6" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.toolListTitle}>Page Rotation Studio</Text>
                  <Text style={styles.toolListDesc}>Load a PDF, rotate pages (90/180/270°), and output layout.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.toolListCard} onPress={() => { setSelectedToolFile(null); setCurrentScreen('tool-split'); }}>
                <View style={[styles.toolListIcon, { backgroundColor: 'rgba(236,72,153,0.15)' }]}>
                  <Scissors size={22} color="#ec4899" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.toolListTitle}>PDF Splitter & Extractor</Text>
                  <Text style={styles.toolListDesc}>Extract page ranges out of a large document.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.toolListCard} onPress={() => { setSelectedToolFile(null); setCurrentScreen('tool-delete'); }}>
                <View style={[styles.toolListIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                  <Trash2 size={22} color="#ef4444" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.toolListTitle}>Page Deletions Studio</Text>
                  <Text style={styles.toolListDesc}>Select custom page indexes and discard them from a PDF.</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* TAB 3: FILE VAULT */}
          {activeTab === 'vault' && (
            <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
              <View style={styles.vaultHeader}>
                <Text style={styles.viewTitleText}>App Vault</Text>
                <TouchableOpacity onPress={loadVaultFiles}>
                  <RefreshCw size={18} color="#007aff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.viewSubtitleText}>Offline document storage directory</Text>

              {refreshingVault ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#007aff" />
                </View>
              ) : vaultFiles.length > 0 ? (
                <FlatList
                  data={vaultFiles}
                  keyExtractor={item => item.uri}
                  contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
                  renderItem={({ item }) => (
                    <View style={styles.vaultCard}>
                      <View style={styles.vaultIconContainer}>
                        <FileText size={22} color="#ff453a" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={styles.vaultFileName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.vaultFileMeta}>{item.size} • {new Date(item.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <TouchableOpacity style={styles.vaultActionBtn} onPress={() => shareVaultFile(item.uri)}>
                        <Share2 size={16} color="#007aff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.vaultActionBtn, { marginLeft: 8 }]} onPress={() => deleteVaultFile(item.uri)}>
                        <Trash2 size={16} color="#ff453a" />
                      </TouchableOpacity>
                    </View>
                  )}
                />
              ) : (
                <View style={styles.emptyVault}>
                  <Folder size={48} color="#2c2c2e" />
                  <Text style={styles.emptyVaultText}>Vault is Empty</Text>
                  <Text style={styles.emptyVaultSubtext}>Saved scans and compiled PDFs will appear here.</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 4: DEVELOPER PROFILE */}
          {activeTab === 'developer' && (
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              <Text style={styles.viewTitleText}>Branding & Profile</Text>
              
              <View style={styles.devCard}>
                <View style={styles.devAvatar}>
                  <User size={48} color="white" />
                </View>
                <Text style={styles.devName}>SONU VERMA</Text>
                <Text style={styles.devTitle}>Senior Full-Stack & Desktop Engineer</Text>
                
                <View style={styles.divider} />
                
                <TouchableOpacity style={styles.linkRow} onPress={() => Alert.alert('GitHub Link', 'Open: github.com/sonuverma11')}>
                  <Smartphone size={16} color="#8e8e93" />
                  <Text style={styles.linkText}>GitHub: sonuverma11</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.linkRow}>
                  <Layers size={16} color="#8e8e93" />
                  <Text style={styles.linkText}>Product: OmniPDF Suite</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.devInfoBox}>
                <Text style={styles.devInfoTitle}>About OmniPDF Suite</Text>
                <Text style={styles.devInfoDesc}>
                  OmniPDF is a high-fidelity document suite deployed across Web (Vercel), Desktop (Tauri - Linux/macOS/Windows), and Mobile (Expo - Android).
                </Text>
                <Text style={styles.devInfoDesc}>
                  Designed for 100% offline, privacy-first editing, layout compilation, and scan workflows.
                </Text>
              </View>
            </ScrollView>
          )}

          {/* Frosted Dark Tab Bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('home')}>
              <Layers size={20} color={activeTab === 'home' ? '#007aff' : '#8e8e93'} />
              <Text style={[styles.tabLabel, { color: activeTab === 'home' ? '#007aff' : '#8e8e93' }]}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('tools')}>
              <Settings size={20} color={activeTab === 'tools' ? '#007aff' : '#8e8e93'} />
              <Text style={[styles.tabLabel, { color: activeTab === 'tools' ? '#007aff' : '#8e8e93' }]}>Tools</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('vault')}>
              <Folder size={20} color={activeTab === 'vault' ? '#007aff' : '#8e8e93'} />
              <Text style={[styles.tabLabel, { color: activeTab === 'vault' ? '#007aff' : '#8e8e93' }]}>Vault</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('developer')}>
              <User size={20} color={activeTab === 'developer' ? '#007aff' : '#8e8e93'} />
              <Text style={[styles.tabLabel, { color: activeTab === 'developer' ? '#007aff' : '#8e8e93' }]}>Developer</Text>
            </TouchableOpacity>
          </View>

        </View>
      )}

      {/* FULL SCREEN 1: CAMERA SCANNER */}
      {currentScreen === 'scanner' && (
        <View style={styles.scannerContainer}>
          <View style={styles.scannerTopBar}>
            <TouchableOpacity style={styles.scannerCloseButton} onPress={() => setCurrentScreen('dashboard')}>
              <ChevronLeft size={24} color="white" />
              <Text style={styles.scannerCloseText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Viewfinder</Text>
            <TouchableOpacity style={styles.flashButton} onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')}>
              <Zap size={20} color={flash === 'on' ? '#ffd60a' : '#8e8e93'} />
            </TouchableOpacity>
          </View>

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
            
            <View style={styles.overlayFrame} />
            
            <View style={styles.pageBadge}>
              <Text style={styles.pageBadgeText}>{scannedImages.length} Pages Scanned</Text>
            </View>
          </View>

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

            <TouchableOpacity style={styles.shutterButton} onPress={handleCapture}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            {scannedImages.length > 0 ? (
              <TouchableOpacity style={styles.doneButton} onPress={() => setCurrentScreen('viewer')}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 60 }} />
            )}
          </View>
        </View>
      )}

      {/* FULL SCREEN 2: SCAN PAGES VIEWER */}
      {currentScreen === 'viewer' && (
        <View style={styles.viewerContainer}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity style={styles.viewerBackButton} onPress={() => setCurrentScreen('scanner')}>
              <ChevronLeft size={24} color="white" />
              <Text style={styles.viewerBackText}>Retake</Text>
            </TouchableOpacity>
            <Text style={styles.viewerTitle}>Scanned Pages</Text>
            <View style={{ width: 80 }} />
          </View>

          <ScrollView contentContainerStyle={styles.viewerScroll}>
            {scannedImages.map((uri, index) => (
              <View key={index} style={styles.pageCard}>
                <Image source={{ uri }} style={styles.pageImage} />
                <View style={styles.pageCardFooter}>
                  <Text style={styles.pageNumberLabel}>Page {index + 1}</Text>
                  <TouchableOpacity style={styles.deletePageBtn} onPress={() => deleteScan(index)}>
                    <Trash2 size={16} color="#ff453a" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.viewerFooter}>
            <TouchableOpacity style={styles.addPagesBtn} onPress={() => setCurrentScreen('scanner')}>
              <CameraIcon size={16} color="#007aff" style={{ marginRight: 6 }} />
              <Text style={styles.addPagesBtnText}>Add Page</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.compileBtn} onPress={generateAndSharePDF} disabled={generatingPdf}>
              {generatingPdf ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Share2 size={16} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.compileBtnText}>Save & Share</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FULL SCREEN 3: MERGE PDF TOOL */}
      {currentScreen === 'tool-merge' && (
        <View style={styles.viewerContainer}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity style={styles.viewerBackButton} onPress={() => setCurrentScreen('dashboard')}>
              <ChevronLeft size={24} color="white" />
              <Text style={styles.viewerBackText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.viewerTitle}>Merge PDFs</Text>
            <TouchableOpacity style={{ padding: 8 }} onPress={pickMergeFiles}>
              <Plus size={22} color="#007aff" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.viewerScroll}>
            {mergeFiles.length > 0 ? (
              mergeFiles.map((file, index) => (
                <View key={index} style={styles.mergeItemCard}>
                  <FileText size={22} color="#ff453a" />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.mergeItemName} numberOfLines={1}>{file.name}</Text>
                    <Text style={styles.mergeItemMeta}>Doc {index + 1}</Text>
                  </View>
                  <View style={styles.mergeOrderControls}>
                    <TouchableOpacity 
                      disabled={index === 0} 
                      style={[styles.orderBtn, index === 0 && { opacity: 0.2 }]}
                      onPress={() => reorderMergeFile(index, 'up')}
                    >
                      <ArrowUp size={16} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      disabled={index === mergeFiles.length - 1} 
                      style={[styles.orderBtn, index === mergeFiles.length - 1 && { opacity: 0.2 }]}
                      onPress={() => reorderMergeFile(index, 'down')}
                    >
                      <ArrowDown size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    style={styles.mergeRemoveBtn}
                    onPress={() => setMergeFiles(prev => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={16} color="#ff453a" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyToolBox}>
                <Files size={48} color="#2c2c2e" />
                <Text style={styles.emptyVaultText}>No Documents Selected</Text>
                <Text style={styles.emptyVaultSubtext}>Tap the "+" icon in the top right to add files.</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.viewerFooter}>
            <TouchableOpacity 
              style={[styles.compileBtn, { marginLeft: 0, opacity: mergeFiles.length >= 2 && !toolProcessing ? 1 : 0.4 }]} 
              disabled={mergeFiles.length < 2 || toolProcessing}
              onPress={runMergePDFs}
            >
              {toolProcessing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.compileBtnText}>Merge {mergeFiles.length} PDF Documents</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FULL SCREEN 4: ROTATE PDF TOOL */}
      {currentScreen === 'tool-rotate' && (
        <View style={styles.viewerContainer}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity style={styles.viewerBackButton} onPress={() => setCurrentScreen('dashboard')}>
              <ChevronLeft size={24} color="white" />
              <Text style={styles.viewerBackText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.viewerTitle}>Rotate Pages</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.toolConfigScroll}>
            {selectedToolFile ? (
              <View style={styles.toolSelectedCard}>
                <FileText size={32} color="#ff453a" />
                <Text style={styles.selectedFileName}>{selectedToolFile.name}</Text>
                <TouchableOpacity style={styles.changeFileBtn} onPress={pickSingleFileForTool}>
                  <Text style={styles.changeFileText}>Select Different File</Text>
                </TouchableOpacity>

                <View style={styles.divider} />
                
                <Text style={styles.toolSectionTitle}>Choose Rotation Angle</Text>
                <View style={styles.angleRow}>
                  {[90, 180, 270].map(angle => (
                    <TouchableOpacity 
                      key={angle} 
                      style={[styles.angleBtn, rotationAngle === angle && styles.angleBtnActive]}
                      onPress={() => setRotationAngle(angle)}
                    >
                      <RotateCw size={16} color={rotationAngle === angle ? 'white' : '#8e8e93'} />
                      <Text style={[styles.angleBtnText, rotationAngle === angle && { color: 'white' }]}>{angle}°</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyToolBox}>
                <RotateCw size={48} color="#2c2c2e" />
                <TouchableOpacity style={styles.selectFileMainBtn} onPress={pickSingleFileForTool}>
                  <Text style={styles.selectFileMainText}>Select PDF File</Text>
                </TouchableOpacity>
                <Text style={styles.emptyVaultSubtext}>Pick a PDF to rotate its pages offline.</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.viewerFooter}>
            <TouchableOpacity 
              style={[styles.compileBtn, { marginLeft: 0, opacity: selectedToolFile && !toolProcessing ? 1 : 0.4 }]} 
              disabled={!selectedToolFile || toolProcessing}
              onPress={runRotatePDF}
            >
              {toolProcessing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.compileBtnText}>Apply Rotation & Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FULL SCREEN 5: SPLIT PDF TOOL */}
      {currentScreen === 'tool-split' && (
        <View style={styles.viewerContainer}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity style={styles.viewerBackButton} onPress={() => setCurrentScreen('dashboard')}>
              <ChevronLeft size={24} color="white" />
              <Text style={styles.viewerBackText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.viewerTitle}>Extract Pages</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.toolConfigScroll}>
            {selectedToolFile ? (
              <View style={styles.toolSelectedCard}>
                <FileText size={32} color="#ff453a" />
                <Text style={styles.selectedFileName}>{selectedToolFile.name}</Text>
                <TouchableOpacity style={styles.changeFileBtn} onPress={pickSingleFileForTool}>
                  <Text style={styles.changeFileText}>Select Different File</Text>
                </TouchableOpacity>

                <View style={styles.divider} />
                
                <Text style={styles.toolSectionTitle}>Define Extraction Page Range</Text>
                <View style={styles.rangeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Start Page</Text>
                    <TextInput 
                      style={styles.rangeInput}
                      keyboardType="number-pad"
                      value={splitStart}
                      onChangeText={setSplitStart}
                    />
                  </View>
                  <View style={{ width: 20 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>End Page</Text>
                    <TextInput 
                      style={styles.rangeInput}
                      keyboardType="number-pad"
                      value={splitEnd}
                      onChangeText={setSplitEnd}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyToolBox}>
                <Scissors size={48} color="#2c2c2e" />
                <TouchableOpacity style={styles.selectFileMainBtn} onPress={pickSingleFileForTool}>
                  <Text style={styles.selectFileMainText}>Select PDF File</Text>
                </TouchableOpacity>
                <Text style={styles.emptyVaultSubtext}>Pick a PDF to extract custom page ranges.</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.viewerFooter}>
            <TouchableOpacity 
              style={[styles.compileBtn, { marginLeft: 0, opacity: selectedToolFile && !toolProcessing ? 1 : 0.4 }]} 
              disabled={!selectedToolFile || toolProcessing}
              onPress={runSplitPDF}
            >
              {toolProcessing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.compileBtnText}>Extract Pages & Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FULL SCREEN 6: DELETE PAGES TOOL */}
      {currentScreen === 'tool-delete' && (
        <View style={styles.viewerContainer}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity style={styles.viewerBackButton} onPress={() => setCurrentScreen('dashboard')}>
              <ChevronLeft size={24} color="white" />
              <Text style={styles.viewerBackText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.viewerTitle}>Delete Pages</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.toolConfigScroll}>
            {selectedToolFile ? (
              <View style={styles.toolSelectedCard}>
                <FileText size={32} color="#ff453a" />
                <Text style={styles.selectedFileName}>{selectedToolFile.name}</Text>
                <TouchableOpacity style={styles.changeFileBtn} onPress={pickSingleFileForTool}>
                  <Text style={styles.changeFileText}>Select Different File</Text>
                </TouchableOpacity>

                <View style={styles.divider} />
                
                <Text style={styles.toolSectionTitle}>Pages to Remove</Text>
                <Text style={styles.inputSubtitle}>Enter page numbers separated by commas (e.g. 2, 5, 8)</Text>
                
                <TextInput 
                  style={styles.textInputFull}
                  placeholder="e.g. 2, 4"
                  placeholderTextColor="#3a3a3c"
                  value={deletePageNums}
                  onChangeText={setDeletePageNums}
                />
              </View>
            ) : (
              <View style={styles.emptyToolBox}>
                <Trash2 size={48} color="#2c2c2e" />
                <TouchableOpacity style={styles.selectFileMainBtn} onPress={pickSingleFileForTool}>
                  <Text style={styles.selectFileMainText}>Select PDF File</Text>
                </TouchableOpacity>
                <Text style={styles.emptyVaultSubtext}>Discard target pages from a PDF document.</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.viewerFooter}>
            <TouchableOpacity 
              style={[styles.compileBtn, { marginLeft: 0, opacity: selectedToolFile && !toolProcessing ? 1 : 0.4 }]} 
              disabled={!selectedToolFile || toolProcessing}
              onPress={runDeletePages}
            >
              {toolProcessing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.compileBtnText}>Discard Pages & Save</Text>
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
    paddingBottom: 100,
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
    width: 32,
    height: 32,
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
    marginBottom: 24,
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
    marginBottom: 14,
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
    width: 40,
    height: 40,
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
    marginTop: 10,
    marginBottom: 20,
  },
  privacyText: {
    color: '#8e8e93',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  footerText: {
    color: '#3a3a3c',
    fontSize: 12,
    fontWeight: '600',
  },
  footerLink: {
    color: '#3a3a3c',
    fontSize: 10,
    marginTop: 4,
  },

  // Navigation Tab Bar styles
  tabBar: {
    flexDirection: 'row',
    height: 64,
    borderTopWidth: 1,
    borderTopColor: '#1c1c1e',
    backgroundColor: 'rgba(0,0,0,0.92)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 15 : 0,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },

  // Views layouts
  viewTitleText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
  },
  viewSubtitleText: {
    color: '#8e8e93',
    fontSize: 14,
    marginBottom: 24,
  },

  // Tool Selection List Cards
  toolListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    marginBottom: 16,
  },
  toolListIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolListTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  toolListDesc: {
    color: '#8e8e93',
    fontSize: 12,
    lineHeight: 16,
  },

  // Vault styles
  vaultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  vaultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    marginBottom: 12,
  },
  vaultIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,69,58,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaultFileName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '90%',
  },
  vaultFileMeta: {
    color: '#8e8e93',
    fontSize: 11,
    marginTop: 2,
  },
  vaultActionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyVault: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyVaultText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyVaultSubtext: {
    color: '#8e8e93',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 30,
  },

  // Developer Profile styles
  devCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  devAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#2c2c2e',
  },
  devName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  devTitle: {
    color: '#8e8e93',
    fontSize: 13,
    marginTop: 4,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#2c2c2e',
    marginVertical: 20,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  linkText: {
    color: '#007aff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
  devInfoBox: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  devInfoTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  devInfoDesc: {
    color: '#8e8e93',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
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

  // Tool Specific UI Components
  mergeItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    marginBottom: 10,
  },
  mergeItemName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '85%',
  },
  mergeItemMeta: {
    color: '#8e8e93',
    fontSize: 11,
    marginTop: 2,
  },
  mergeOrderControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#2c2c2e',
    marginLeft: 6,
  },
  mergeRemoveBtn: {
    padding: 8,
    marginLeft: 10,
  },
  emptyToolBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 150,
  },
  selectFileMainBtn: {
    backgroundColor: '#007aff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  selectFileMainText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },

  // Config UI Screens
  toolConfigScroll: {
    padding: 20,
  },
  toolSelectedCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    alignItems: 'center',
  },
  selectedFileName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  changeFileBtn: {
    padding: 8,
  },
  changeFileText: {
    color: '#007aff',
    fontSize: 13,
    fontWeight: '600',
  },
  toolSectionTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  angleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  angleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    backgroundColor: '#000000',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    width: '30%',
  },
  angleBtnActive: {
    borderColor: '#007aff',
    backgroundColor: 'rgba(0,122,255,0.2)',
  },
  angleBtnText: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  inputLabel: {
    color: '#8e8e93',
    fontSize: 12,
    marginBottom: 6,
  },
  rangeInput: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 10,
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  inputSubtitle: {
    color: '#8e8e93',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: 14,
    marginTop: -6,
  },
  textInputFull: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 10,
    color: 'white',
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
    fontSize: 15,
  }
});
