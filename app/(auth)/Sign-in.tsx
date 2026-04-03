import { Link } from 'expo-router'
import { View, Text } from 'react-native'

const SignIn = () => {
  return (
    <View>
      <Text>Sign-in</Text>
      <Link href="/(auth)/Sign-up">create new account</Link>
      <Link href="/">Home</Link>

    </View>
  )
}

export default SignIn