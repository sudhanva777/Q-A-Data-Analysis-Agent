# Sample Q&A Test Suite

This document contains verified sample questions and expected analysis patterns for the Q&A Data Analysis Agent.

## Sample Questions

1. **What are the total sales by region?**
   - Expected: grouped totals by region, ideally shown as a bar chart and supporting table.

2. **Which product department has the highest revenue?**
   - Expected: a ranked result with the top department and its total revenue.

3. **Show average performance metrics by category.**
   - Expected: mean values for relevant metrics grouped by category.

4. **What is the distribution of sales across quarters?**
   - Expected: a time-series or bar chart showing quarterly sales totals.

5. **How many unique customers are in the dataset?**
   - Expected: a scalar count of distinct customer IDs or names.

6. **Which month had the highest total sales?**
   - Expected: the month label and corresponding sales amount.

7. **What are the top 5 selling products by units sold?**
   - Expected: a table of the top products with sales counts.

8. **What is the average order value by sales representative?**
   - Expected: averages grouped by sales rep, with the highest rep highlighted.

9. **How many orders used Standard Class shipping versus Second Class?**
   - Expected: counts by shipping mode and possibly a small chart.

10. **Which region had the lowest total sales?**
    - Expected: the region name with the smallest total sales volume.

## Notes

- Use these questions as regression test prompts for the dataset in `data/sales_data.csv`.
- The agent should compute results from pandas and then compose the final answer from the exact computed values.
- If the dataset is different, update the questions to match available columns and business context.

