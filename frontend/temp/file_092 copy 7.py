# Prime number checker
def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

def find_primes(limit):
    return [i for i in range(2, limit) if is_prime(i)]

if __name__ == '__main__':
    print('Primes up to 20:', find_primes(20))
