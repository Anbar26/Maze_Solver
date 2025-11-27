# Math utilities
import math

def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n-1)

def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

def lcm(a, b):
    return abs(a * b) // gcd(a, b)

if __name__ == '__main__':
    print('Factorial of 5:', factorial(5))
    print('GCD of 48 and 18:', gcd(48, 18))
    print('LCM of 12 and 18:', lcm(12, 18))
