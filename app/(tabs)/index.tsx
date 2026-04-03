import "@/global.css";
import { Link } from "expo-router";
import { styled } from 'nativewind';
import { Text } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView)
 
export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-background p-5">

      <Text className="text-5xl font-sans-extrabold ">
        Home
      </Text>

      <Link href="/(auth)/Sign-in" className="mt-4 font-sans-bold text-white bg-primary p-4 rounded">sign In</Link>
      <Link href="/(auth)/Sign-up" className="mt-4 font-sans-bold text-white bg-primary p-4 rounded">sign Up</Link>
    </SafeAreaView>
  );
}