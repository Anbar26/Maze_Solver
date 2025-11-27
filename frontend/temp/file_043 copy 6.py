# String utilities
def reverse_string(s):
    return s[::-1]

def is_palindrome(s):
    s = s.lower().replace(' ', '')
    return s == s[::-1]

def count_vowels(s):
    vowels = 'aeiou'
    return sum(1 for char in s.lower() if char in vowels)

if __name__ == '__main__':
    text = 'Hello World'
    print('Reversed:', reverse_string(text))
    print('Is palindrome:', is_palindrome(text))
    print('Vowel count:', count_vowels(text))
