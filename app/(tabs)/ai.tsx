

import { getColors } from '@/constants/styles'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { getAIResponse, getProductivityInsight } from '@/lib/ai-service'
import { useUser } from '@clerk/expo'
import React, { useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

export default function AIScreen() {
  const { user } = useUser()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)
  
  const email = user?.emailAddresses?.[0]?.emailAddress
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [showInsight, setShowInsight] = useState(true)
  const [insight, setInsight] = useState('')
  const flatListRef = useRef<FlatList>(null)

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

    const aiResponse = await getAIResponse(inputText, email, conversationHistory)

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: aiResponse,
      isUser: false,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, aiMessage])
    setLoading(false)

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }

  const renderMessage = (item: Message) => (
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
        <Text
          style={[
            dynamicStyles.messageText,
            item.isUser ? dynamicStyles.userText : dynamicStyles.aiText,
          ]}
        >
          {item.text}
        </Text>
      </View>
    </View>
  )

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    messagesContent: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexGrow: 1,
    },
    messageContainer: {
      marginVertical: 6,
      flexDirection: 'row',
    },
    userMessageContainer: {
      justifyContent: 'flex-end',
    },
    aiMessageContainer: {
      justifyContent: 'flex-start',
    },
    messageBubble: {
      maxWidth: '85%',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
    },
    userBubble: {
      backgroundColor: colors.primary,
    },
    aiBubble: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    messageText: {
      fontSize: 14,
      lineHeight: 18,
    },
    userText: {
      color: colors.text,
    },
    aiText: {
      color: colors.text,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    insightCard: {
      marginHorizontal: 12,
      marginVertical: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderRadius: 10,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    insightTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 6,
    },
    insightText: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    inputWrapper: {
      paddingBottom: 80,
    },
    inputContainer: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 14,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sendButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: colors.border,
    },
    sendButtonText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 14,
    },
  })

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={dynamicStyles.container}
    >
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.headerTitle}>🤖 Pocket AI</Text>
        <Text style={dynamicStyles.headerSubtitle}>Your Personal Assistant</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => renderMessage(item)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={dynamicStyles.messagesContent}
        scrollEnabled={true}
        ListFooterComponent={
          <>
            {loading && (
              <View style={dynamicStyles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
            {showInsight && insight && (
              <View style={dynamicStyles.insightCard}>
                <Text style={dynamicStyles.insightTitle}>💡 Productivity Tip</Text>
                <Text style={dynamicStyles.insightText}>{insight}</Text>
              </View>
            )}
          </>
        }
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true })
        }}
      />

      <View style={dynamicStyles.inputWrapper}>
        <View style={dynamicStyles.inputContainer}>
          <TextInput
            style={dynamicStyles.input}
            placeholder="Ask me anything..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!loading}
          />
          <TouchableOpacity
            style={[dynamicStyles.sendButton, loading && dynamicStyles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={loading || !inputText.trim()}
          >
            <Text style={dynamicStyles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  )
}
