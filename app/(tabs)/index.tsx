import "@/global.css";
import { Link } from "expo-router";
import { Text } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from 'nativewind';

const SafeAreaView = styled(RNSafeAreaView)
 
export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <Text className="text-xl font-bold text-success">
        Welcome to Nativewind!
      </Text>

      <Link href="/(auth)/Sign-in" className="mt-4 text-white bg-primary p-4 rounded">sign In</Link>
      <Link href="/(auth)/Sign-up" className="mt-4 text-white bg-primary p-4 rounded">sign Up</Link>

      <Link href="/subscriptions/spotify" className="mt-4 text-white bg-primary p-4 rounded">Go to Spotify</Link>

      <Link href={{
        pathname:"/subscriptions/[id]",
        params:{id:"claude"},
      }} className="mt-4 text-white bg-primary p-4 rounded">claude</Link>
    </SafeAreaView>
  );
}