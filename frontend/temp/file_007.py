# Text analyzer
import re
from collections import Counter

class TextAnalyzer:
    def __init__(self, text):
        self.text = text.lower()
    
    def word_count(self):
        words = re.findall(r'\b\w+\b', self.text)
        return len(words)
    
    def character_count(self):
        return len(self.text)
    
    def sentence_count(self):
        sentences = re.split(r'[.!?]+', self.text)
        return len([s for s in sentences if s.strip()])
    
    def most_common_words(self, n=10):
        words = re.findall(r'\b\w+\b', self.text)
        return Counter(words).most_common(n)
    
    def average_word_length(self):
        words = re.findall(r'\b\w+\b', self.text)
        if not words:
            return 0
        return sum(len(word) for word in words) / len(words)

if __name__ == "__main__":
    sample_text = "Hello world! This is a sample text for analysis."
    analyzer = TextAnalyzer(sample_text)
    print("Word count:", analyzer.word_count())
    print("Most common words:", analyzer.most_common_words(5))
