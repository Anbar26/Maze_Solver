# Data structures
class Stack:
    def __init__(self):
        self.items = []
    
    def push(self, item):
        self.items.append(item)
    
    def pop(self):
        return self.items.pop() if self.items else None
    
    def peek(self):
        return self.items[-1] if self.items else None
    
    def is_empty(self):
        return len(self.items) == 0

class Queue:
    def __init__(self):
        self.items = []
    
    def enqueue(self, item):
        self.items.insert(0, item)
    
    def dequeue(self):
        return self.items.pop() if self.items else None
    
    def is_empty(self):
        return len(self.items) == 0

if __name__ == '__main__':
    stack = Stack()
    stack.push(1)
    stack.push(2)
    print('Stack pop:', stack.pop())
