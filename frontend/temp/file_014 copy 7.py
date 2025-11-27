# List operations
def flatten_list(nested_list):
    result = []
    for item in nested_list:
        if isinstance(item, list):
            result.extend(flatten_list(item))
        else:
            result.append(item)
    return result

def remove_duplicates(lst):
    return list(set(lst))

def chunk_list(lst, size):
    return [lst[i:i+size] for i in range(0, len(lst), size)]

if __name__ == '__main__':
    nested = [1, [2, 3], [4, [5, 6]]]
    print('Flattened:', flatten_list(nested))
