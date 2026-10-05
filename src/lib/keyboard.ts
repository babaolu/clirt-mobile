import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, TextInput, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView } from 'react-native';

/**
 * Keeps the focused input above the keyboard in a ScrollView. Edge-to-edge Android doesn't resize the
 * window for the keyboard and KeyboardAvoidingView doesn't scroll the focused input into view, so:
 * pad the content by the keyboard's height, then scroll by however much the input is covered.
 */
export function useKeyboardAwareScroll(margin = 24) {
	const scrollRef = useRef<ScrollView>(null);
	const offset = useRef(0);
	const keyboardTop = useRef<number | null>(null);
	const [keyboardHeight, setKeyboardHeight] = useState(0);

	const reveal = useCallback(() => {
		const top = keyboardTop.current;
		const input = TextInput.State.currentlyFocusedInput();
		if (top === null || !input) return;
		input.measureInWindow((_x, y, _w, h) => {
			const covered = y + h + margin - top;
			if (covered > 0) scrollRef.current?.scrollTo({ y: offset.current + covered, animated: true });
		});
	}, [margin]);

	useEffect(() => {
		const show = Keyboard.addListener('keyboardDidShow', (e) => {
			keyboardTop.current = e.endCoordinates.screenY;
			setKeyboardHeight(e.endCoordinates.height);
			setTimeout(reveal, 80); // after the padding has been laid out
		});
		const hide = Keyboard.addListener('keyboardDidHide', () => {
			keyboardTop.current = null;
			setKeyboardHeight(0);
		});
		return () => {
			show.remove();
			hide.remove();
		};
	}, [reveal]);

	return {
		scrollRef,
		keyboardHeight,
		onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
			offset.current = e.nativeEvent.contentOffset.y;
		},
		/** For inputs' onFocus: moving between fields while the keyboard stays open fires no keyboard event. */
		onInputFocus: () => setTimeout(reveal, 80)
	};
}
