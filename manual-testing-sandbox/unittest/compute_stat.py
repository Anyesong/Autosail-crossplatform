import processdata
def compute_statistics(data):
    """
    这个函数计算并输出数据集的统计信息，包括平均值、标准差、最大值、最小值等。
    它还会调用`process_data`函数对数据进行处理。
    """
    # 调用 process_data 函数进行数据预处理
    processed_data = process_data(data)

    # 如果处理后的数据为空，则返回一个默认的统计值
    if not processed_data:
        print("数据为空，无法计算统计信息。")
        return None

    # 计算平均值
    mean = sum(processed_data) / len(processed_data)

    # 计算标准差
    squared_diff = [(x - mean) ** 2 for x in processed_data]
    variance = sum(squared_diff) / len(processed_data)
    std_dev = variance ** 0.5

    # 计算最大值和最小值
    max_value = max(processed_data)
    min_value = min(processed_data)

    # 输出统计信息
    print("数据统计信息:")
    print(f"处理后的数据: {processed_data}")
    print(f"平均值: {mean:.2f}")
    print(f"标准差: {std_dev:.2f}")
    print(f"最大值: {max_value}")
    print(f"最小值: {min_value}")

    # 返回计算结果的字典
    return {
        'mean': mean,
        'std_dev': std_dev,
        'max_value': max_value,
        'min_value': min_value
    }


# 示例数据集
data = [3, -5, 7, 10, 2, -1, 4, 0, -3, 6]

# 调用计算统计信息的函数
compute_statistics(data)