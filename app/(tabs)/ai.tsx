

import { getColors } from '@/constants/styles'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { getAIResponse, getProductivityInsight } from '@/lib/ai-service'
import { useUser } from '@clerk/expo'
import { Ionicons } from '@expo/vector-icons'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { BlurView } from 'expo-blur'
import { useFonts } from 'expo-font'
import { useRouter } from 'expo-router'
import LottieView from 'lottie-react-native'
import React, { useEffect, useRef, useState } from 'react'
import {
    Animated,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const { width } = Dimensions.get('window')

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

export default function AIScreen() {
  const { user } = useUser()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const tabBarHeight = useBottomTabBarHeight()
  const colors = getColors(isDark)
  const brightGold = '#D4AF37'
  const softGold = '#E8C96A'
  const backButtonScale = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const [fontsLoaded] = useFonts({
    'Roboto Slab': require('../../assets/Font/RobotoSlab-VariableFont_wght.ttf'),
    'Momo Signature': require('../../assets/Font/MomoSignature-Regular.ttf'),
  })
  
  const email = user?.emailAddresses?.[0]?.emailAddress
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [showInsight, setShowInsight] = useState(true)
  const [insight, setInsight] = useState('')
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(backButtonScale, {
          toValue: 1.06,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(backButtonScale, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [backButtonScale])

  useEffect(() => {
    if (email) {
      loadInsight()
      setMessages([
        {
          id: '0',
          text: 'Hi! 👋 I\'m your PocketCare AI Assistant. I can help you with task management, goal tracking, health tips, and productivity advice. What can I help you with today?',
          isUser: false,
          timestamp: new Date(),
        },
      ])
    }
  }, [email])

  const loadInsight = async () => {
    if (!email) return
    const insightText = await getProductivityInsight(email)
    setInsight(insightText)
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || !email) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputText('')
    setLoading(true)
    setShowInsight(false)

    const conversationHistory = messages.map((msg) => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.text,
    }))

    try {
      const aiResponse = await getAIResponse(inputText, email, conversationHistory)

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message?.includes('rate_limit') 
          ? "I'm a bit overwhelmed with requests right now! 😅 Please try again in a few minutes."
          : "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }

  const MessageItem = React.memo(({ item }: { item: Message }) => {
    return (
      <View
        style={[
          dynamicStyles.messageContainer,
          item.isUser ? dynamicStyles.userMessageContainer : dynamicStyles.aiMessageContainer,
        ]}
      >
        <View
          style={[
            dynamicStyles.messageBubble,
            item.isUser ? dynamicStyles.userBubble : dynamicStyles.aiBubble,
          ]}
        >
          {!item.isUser && (
            <View style={dynamicStyles.aiIconBadge}>
              <LottieView
                source={require('../../assets/animations/AI.json')}
                autoPlay
                loop
                style={{ width: 22, height: 22 }}
              />
            </View>
          )}
          <Text
            style={[
              dynamicStyles.messageText,
              item.isUser ? { color: isDark ? '#FFFFFF' : '#000000' } : dynamicStyles.aiText,
            ]}
          >
            {item.text}
          </Text>
          <Text style={[dynamicStyles.timestamp, item.isUser ? { textAlign: 'right', color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' } : { color: colors.textSecondary }]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    )
  })

  const renderMessage = (item: Message) => <MessageItem item={item} />

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
      overflow: 'hidden',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#D4AF37',
      borderWidth: 1.5,
      borderColor: '#D4AF37',
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    headerTitle: {
      fontSize: 24, // Main Heading (H1)
      fontFamily: 'Roboto Slab',
      color: isDark ? '#FFFFFF' : '#000000',
      letterSpacing: -0.5,
      textShadowColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    headerSubtitle: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginTop: 2,
      alignSelf: 'flex-start',
      borderWidth: 0.5,
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
      marginRight: 5,
    },
    statusText: {
      fontSize: 10,
      color: '#10B981',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    headerDivider: {
      height: 0.5,
      backgroundColor: softGold,
      marginHorizontal: 16,
      marginBottom: 12,
      opacity: 0.6,
    },
    aiHeaderIconContainer: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.95)' : '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: brightGold,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    messagesContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: tabBarHeight + 100,
      flexGrow: 1,
    },
    messageContainer: {
      marginVertical: 6,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    userMessageContainer: {
      justifyContent: 'flex-end',
      paddingLeft: 40,
    },
    aiMessageContainer: {
      justifyContent: 'flex-start',
      paddingRight: 40,
    },
    messageBubble: {
      maxWidth: '100%',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
    },
    aiBubble: {
      backgroundColor: isDark ? 'rgba(40, 40, 40, 0.8)' : '#F0F0F0',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      borderBottomLeftRadius: 4,
    },
    userBubble: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
      borderBottomRightRadius: 4,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0,0,0,0.1)',
    },
    aiIconBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
      position: 'absolute',
      top: -14,
      left: -4,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: brightGold,
      zIndex: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    messageText: {
      fontSize: 16, // Body Text
      lineHeight: 24,
      fontWeight: '500',
      letterSpacing: 0.1,
    },
    userText: {
      color: '#000000',
    },
    aiText: {
      color: colors.text,
    },
    timestamp: {
      fontSize: 12, // Small Text
      marginTop: 4,
      opacity: 0.6,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    insightCard: {
      marginHorizontal: 16,
      marginVertical: 20,
      padding: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    insightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    insightTitle: {
      fontSize: 18, // Sub Heading (H3)
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#000000',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    insightText: {
      fontSize: 14, // Secondary Text
      color: colors.text,
      lineHeight: 22,
    },
    inputWrapper: {
      paddingBottom: Platform.OS === 'ios' ? 12 : 10,
      marginBottom: tabBarHeight + (Platform.OS === 'ios' ? 14 : 12),
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      backgroundColor: 'transparent',
    },
    inputContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: Platform.OS === 'ios' ? 10 : 5,
    },
    inputInnerContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      borderRadius: 24,
      paddingLeft: 16,
      paddingRight: 6,
      paddingVertical: 4,
      borderWidth: 1.5,
      borderColor: brightGold,
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      maxHeight: 120,
      paddingTop: 8,
      paddingBottom: 8,
      paddingRight: 12,
      fontWeight: 'normal',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    sendButton: {
      width: 44,
      height: 44,
      backgroundColor: brightGold,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      borderWidth: 0,
      shadowOpacity: 0,
      elevation: 0,
    },
  })

  if (!fontsLoaded) {
    return null
  }

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={dynamicStyles.container}
      >
        <View style={dynamicStyles.header}>
          <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={dynamicStyles.headerRow}>
            <TouchableOpacity style={dynamicStyles.backButton} onPress={() => router.replace('/(tabs)')}>
              <Ionicons name="chevron-back" size={22} color={isDark ? "#000000" : "#FFFFFF"} />
            </TouchableOpacity>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={dynamicStyles.headerTitle}>Pocket AI</Text>
              <Text style={dynamicStyles.headerSubtitle}>Your intelligent assistant</Text>
            </View>
              <View style={dynamicStyles.aiHeaderIconContainer}>
                <LottieView
                  source={require('../../assets/animations/AI.json')}
                  autoPlay
                  loop
                  style={{ width: 45, height: 45 }}
                />
              </View>
            </View>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => renderMessage(item)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={dynamicStyles.messagesContent}
          scrollEnabled={true}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          ListFooterComponent={
            <>
              {loading && (
                <View style={dynamicStyles.loadingContainer}>
                   <LottieView
                    source={require('../../assets/animations/Loader.json')}
                    autoPlay
                    loop
                    style={{ width: 120, height: 120 }}
                  />
                </View>
              )}
              {showInsight && insight && (
                <View style={dynamicStyles.insightCard}>
                  <View style={dynamicStyles.insightHeader}>
                     <LottieView
                      source={require('../../assets/animations/AI.json')}
                      autoPlay
                      loop
                      style={{ width: 24, height: 24 }}
                    />
                    <Text style={dynamicStyles.insightTitle}>Pro Insight</Text>
                  </View>
                  <Text style={dynamicStyles.insightText}>{insight}</Text>
                </View>
              )}
            </>
          }
        />

        <View style={dynamicStyles.inputWrapper}>
          <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={dynamicStyles.inputContainer}>
            <View style={dynamicStyles.inputInnerContainer}>
              <TextInput
                style={dynamicStyles.input}
                placeholder="Type your message..."
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                value={inputText}
                onChangeText={setInputText}
                multiline
                editable={!loading}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[
                  dynamicStyles.sendButton,
                  (loading || !inputText.trim()) && dynamicStyles.sendButtonDisabled
                ]}
                onPress={handleSendMessage}
                disabled={loading || !inputText.trim()}
              >
                <Ionicons 
                  name={loading ? "hourglass-outline" : "send"} 
                  size={22} 
                  color={loading || !inputText.trim() ? colors.textSecondary : "#000000"} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

