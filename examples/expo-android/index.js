import { registerRootComponent } from 'expo';
import { useLocales } from 'expo-localization';
import { useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import en from './messages/en.json';
import tr from './messages/tr.json';

const languages = [
  { code: 'en', label: 'English', messages: en },
  { code: 'tr', label: 'Türkçe', messages: tr },
];

function TrailNotes() {
  const deviceLocales = useLocales();
  const [languageOverride, setLanguageOverride] = useState(null);
  const languageCode = languageOverride ?? deviceLocales[0]?.languageCode;
  const language = languages.find(({ code }) => code === languageCode) ?? languages[0];
  const { app, trail } = language.messages;
  const distance = new Intl.NumberFormat(language.code, {
    style: 'unit',
    unit: 'kilometer',
  }).format(4.6);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <Text accessibilityRole="header" style={styles.title}>{app.title}</Text>
        <View style={styles.languagePicker}>
          <Text style={styles.label}>{app.language}</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={app.language} style={styles.options}>
            {languages.map(({ code, label }) => {
              const selected = code === language.code;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setLanguageOverride(code)}
                  style={[styles.option, selected && styles.selectedOption]}
                >
                  <Text style={[styles.optionText, selected && styles.selectedOptionText]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.card}>
          <Text accessibilityRole="header" selectable style={styles.trailName}>{trail.name}</Text>
          <Text selectable style={styles.description}>{trail.description}</Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{trail.distance}</Text>
              <Text selectable style={styles.statValue}>{distance}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{trail.time}</Text>
              <Text selectable style={styles.statValue}>{trail.minutes.replace('{count}', 80)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <TrailNotes />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F4EA' },
  content: { gap: 26, padding: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  title: { color: '#173D32', fontSize: 36, fontWeight: '800' },
  languagePicker: { gap: 8 },
  label: { color: '#455748', fontSize: 14, fontWeight: '600' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 48, paddingHorizontal: 20, paddingVertical: 10, justifyContent: 'center', borderWidth: 1, borderColor: '#81917C', borderRadius: 24 },
  selectedOption: { backgroundColor: '#173D32', borderColor: '#173D32' },
  optionText: { color: '#173D32', fontSize: 16, fontWeight: '600' },
  selectedOptionText: { color: '#FFFFFF' },
  card: { backgroundColor: '#DDE9CE', padding: 24, borderRadius: 24, gap: 12 },
  trailName: { color: '#173D32', fontSize: 28, fontWeight: '700' },
  description: { color: '#2F493E', fontSize: 16, lineHeight: 24 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, borderTopWidth: 1, borderColor: '#ADBE9F', paddingTop: 16 },
  stat: { flexGrow: 1, gap: 4 },
  statLabel: { color: '#455748', fontSize: 14 },
  statValue: { color: '#173D32', fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

registerRootComponent(App);
