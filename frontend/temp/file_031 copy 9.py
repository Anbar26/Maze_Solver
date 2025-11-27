# Fibonacci calculator
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def fibonacci_sequence(count):
    return [fibonacci(i) for i in range(count)]

if __name__ == '__main__':
    print('Fibonacci sequence:', fibonacci_sequence(10))
