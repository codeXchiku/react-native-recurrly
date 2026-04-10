import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter, type Href } from 'expo-router';
import { useSignUp, useAuth } from '@clerk/expo';
import { useState } from 'react';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';

const SafeAreaView = styled(RNSafeAreaView);

type SignUpStep = 'form' | 'verify';

const SignUp = () => {
    const { signUp, errors, fetchStatus } = useSignUp();
    const { isSignedIn } = useAuth();
    const router = useRouter();

    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');

    // Controls which screen is shown; starts at 'form', moves to 'verify'
    // after the email code is sent. Can be reset to 'form' via "Edit email".
    const [step, setStep] = useState<SignUpStep>('form');

    // Validation states
    const [emailTouched, setEmailTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);

    // Client-side validation
    const emailValid = emailAddress.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress);
    const passwordValid = password.length === 0 || password.length >= 8;
    const formValid = emailAddress.length > 0 && password.length >= 8 && emailValid;

    const handleSubmit = async () => {
        if (!formValid) return;

        const { error } = await signUp.password({
            emailAddress,
            password,
        });

        if (error) {
            console.error(JSON.stringify(error, null, 2));
            // posthog.capture('user_sign_up_failed', {
            //     error_message: error.message,
            // });
            return;
        }

        // Send verification email and advance to the verify step
        if (!error) {
            await signUp.verifications.sendEmailCode();
            setStep('verify');
        }
    };

    // FIX 1 — handleVerify: the navigate callback previously console.log'd
    // session.currentTask and returned early, which left Clerk's session pending
    // and the UI stuck on null. Now we redirect to an onboarding route when a
    // currentTask is present, so Clerk's session flow can complete properly.
    const handleVerify = async () => {
        await signUp.verifications.verifyEmailCode({
            code,
        });

        if (signUp.status === 'complete') {
            await signUp.finalize({
                navigate: ({ session, decorateUrl }) => {
                    // If Clerk reports a pending task (e.g. org invite, MFA setup),
                    // redirect to the relevant onboarding route instead of returning
                    // early — returning early left the session in a pending state.
                    if (session?.currentTask) {
                        router.replace(
                            `/onboarding/${session.currentTask.key}` as Href
                        );
                        return;
                    }

                    const url = decorateUrl('/(tabs)');
                    if (url.startsWith('http')) {
                        // Only use window.location on web platform
                        if (typeof window !== 'undefined' && window.location) {
                            window.location.href = url;
                        } else {
                            // On native, just use router navigation
                            router.replace('/(tabs)' as Href);
                        }
                    } else {
                        router.replace(url as Href);
                    }
                },
            });
        } else {
            console.error('Sign-up attempt not complete:', signUp);
        }
    };

    // FIX 2 — "Edit email" recovery action.
    // Resets local step back to the form so the user can correct a mistyped
    // email and restart the attempt. Clears the code field and re-touches
    // nothing — the existing form validation handles the rest.
    const handleEditEmail = () => {
        setCode('');
        setStep('form');
    };

    // Don't show anything if already signed in or sign-up is complete
    if (signUp.status === 'complete' || isSignedIn) {
        return null;
    }

    // Show verification screen based on local step state.
    // We use `step === 'verify'` rather than checking signUp.status so that
    // the "Edit email" action can bring the user back here without needing
    // an SDK-level restart call.
    if (step === 'verify') {
        return (
            <SafeAreaView className="auth-safe-area">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="auth-screen"
                >
                    <ScrollView
                        className="auth-scroll"
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View className="auth-content">
                            {/* Branding */}
                            <View className="auth-brand-block">
                                <View className="auth-logo-wrap">
                                    <View className="auth-logo-mark">
                                        <Text className="auth-logo-mark-text">R</Text>
                                    </View>
                                    <View>
                                        <Text className="auth-wordmark">Recurrly</Text>
                                        <Text className="auth-wordmark-sub">SUBSCRIPTIONS</Text>
                                    </View>
                                </View>
                                <Text className="auth-title">Verify your email</Text>
                                <Text className="auth-subtitle">
                                    We sent a verification code to {emailAddress}
                                </Text>
                            </View>

                            {/* Verification Form */}
                            <View className="auth-card">
                                <View className="auth-form">
                                    <View className="auth-field">
                                        <Text className="auth-label">Verification Code</Text>
                                        <TextInput
                                            className="auth-input"
                                            value={code}
                                            placeholder="Enter 6-digit code"
                                            placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                            onChangeText={setCode}
                                            keyboardType="number-pad"
                                            autoComplete="one-time-code"
                                            maxLength={6}
                                        />
                                        {errors.fields.code && (
                                            <Text className="auth-error">{errors.fields.code.message}</Text>
                                        )}
                                    </View>

                                    <Pressable
                                        className={`auth-button ${(!code || fetchStatus === 'fetching') && 'auth-button-disabled'}`}
                                        onPress={handleVerify}
                                        disabled={!code || fetchStatus === 'fetching'}
                                    >
                                        <Text className="auth-button-text">
                                            {fetchStatus === 'fetching' ? 'Verifying...' : 'Verify Email'}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        className="auth-secondary-button"
                                        onPress={() => signUp.verifications.sendEmailCode()}
                                        disabled={fetchStatus === 'fetching'}
                                    >
                                        <Text className="auth-secondary-button-text">Resend Code</Text>
                                    </Pressable>

                                    {/* FIX 2 — Recovery action: lets the user go back and
                                        correct a mistyped email. Disabled while a request
                                        is in-flight, consistent with other actions here. */}
                                    <Pressable
                                        className={`auth-secondary-button ${fetchStatus === 'fetching' && 'auth-button-disabled'}`}
                                        onPress={handleEditEmail}
                                        disabled={fetchStatus === 'fetching'}
                                    >
                                        <Text className="auth-secondary-button-text">Edit Email Address</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // Main sign-up form
    return (
        <SafeAreaView className="auth-safe-area">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="auth-screen"
            >
                <ScrollView
                    className="auth-scroll"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="auth-content">
                        {/* Branding */}
                        <View className="auth-brand-block">
                            <View className="auth-logo-wrap">
                                <View className="auth-logo-mark">
                                    <Text className="auth-logo-mark-text">R</Text>
                                </View>
                                <View>
                                    <Text className="auth-wordmark">Recurrly</Text>
                                    <Text className="auth-wordmark-sub">SUBSCRIPTIONS</Text>
                                </View>
                            </View>
                            <Text className="auth-title">Create your account</Text>
                            <Text className="auth-subtitle">
                                Start tracking your subscriptions and never miss a payment
                            </Text>
                        </View>

                        {/* Sign-Up Form */}
                        <View className="auth-card">
                            <View className="auth-form">
                                <View className="auth-field">
                                    <Text className="auth-label">Email Address</Text>
                                    <TextInput
                                        className={`auth-input ${emailTouched && !emailValid && 'auth-input-error'}`}
                                        autoCapitalize="none"
                                        value={emailAddress}
                                        placeholder="name@example.com"
                                        placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                        onChangeText={setEmailAddress}
                                        onBlur={() => setEmailTouched(true)}
                                        keyboardType="email-address"
                                        autoComplete="email"
                                    />
                                    {emailTouched && !emailValid && (
                                        <Text className="auth-error">Please enter a valid email address</Text>
                                    )}
                                    {errors.fields.emailAddress && (
                                        <Text className="auth-error">{errors.fields.emailAddress.message}</Text>
                                    )}
                                </View>

                                <View className="auth-field">
                                    <Text className="auth-label">Password</Text>
                                    <TextInput
                                        className={`auth-input ${passwordTouched && !passwordValid && 'auth-input-error'}`}
                                        value={password}
                                        placeholder="Create a strong password"
                                        placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                        secureTextEntry
                                        onChangeText={setPassword}
                                        onBlur={() => setPasswordTouched(true)}
                                        autoComplete="password-new"
                                    />
                                    {passwordTouched && !passwordValid && (
                                        <Text className="auth-error">Password must be at least 8 characters</Text>
                                    )}
                                    {errors.fields.password && (
                                        <Text className="auth-error">{errors.fields.password.message}</Text>
                                    )}
                                    {!passwordTouched && (
                                        <Text className="auth-helper">Minimum 8 characters required</Text>
                                    )}
                                </View>

                                <Pressable
                                    className={`auth-button ${(!formValid || fetchStatus === 'fetching') && 'auth-button-disabled'}`}
                                    onPress={handleSubmit}
                                    disabled={!formValid || fetchStatus === 'fetching'}
                                >
                                    <Text className="auth-button-text">
                                        {fetchStatus === 'fetching' ? 'Creating Account...' : 'Create Account'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Sign-In Link */}
                        <View className="auth-link-row">
                            <Text className="auth-link-copy">Already have an account?</Text>
                            <Link href="/(auth)/Sign-in" asChild>
                                <Pressable>
                                    <Text className="auth-link">Sign In</Text>
                                </Pressable>
                            </Link>
                        </View>

                        {/* Required for Clerk's bot protection */}
                        <View nativeID="clerk-captcha" />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default SignUp;