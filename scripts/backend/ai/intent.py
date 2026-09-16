from models.schemas import Filters, AskResponse
from ai.groq_client import get_intent_from_groq, get_conversational_answer_from_groq
from data.analytics import execute_intent
from charts.plotly_generator import generate_chart_spec

def process_question(question: str, filters: Filters, history: list = None) -> AskResponse:
    try:
        # 1. Get Intent
        print("[ASK] about to call Groq")
        plan = get_intent_from_groq(question, history)
        print("[ASK] Groq call completed")
        
        if plan.dataset == "unsupported":
            answer = get_conversational_answer_from_groq(question, history)
            return AskResponse(answer=answer)
            
        # 2. Execute Pandas
        print("[ASK] analysis started")
        result_df, source = execute_intent(plan, filters)
        print("[ASK] analysis completed")
        
        # 3. Generate Answer and Insights using Pandas Data
        chart_df = result_df.head(20) # ensure JSON is not massively huge
        csv_data = chart_df.to_csv(index=False)
        
        from ai.groq_client import get_insights_from_groq
        answer, insights = get_insights_from_groq(question, csv_data)
        
        # 4. Generate Chart
        chart = None
        print("[ASK] chart started")
        if plan.visualization_required and plan.chart_type and plan.chart_type != "none" and not result_df.empty:
            x_col = None
            y_col = None
            
            if plan.chart_type == "scatter":
                if plan.measure_columns and len(plan.measure_columns) >= 2:
                    x_col = plan.measure_columns[0]
                    y_col = plan.measure_columns[1]
            else:
                x_col = plan.group_by[0] if plan.group_by and len(plan.group_by) > 0 else None
                if not x_col and "date" in chart_df.columns:
                    x_col = "date"
                
                y_col = plan.measure_columns[0] if plan.measure_columns and len(plan.measure_columns) > 0 else None
                
                if not y_col:
                    if "total_arrival_qtl" in chart_df.columns: y_col = "total_arrival_qtl"
                    elif "avg_modal_price" in chart_df.columns: y_col = "avg_modal_price"
                    elif "below_msp_rate_pct" in chart_df.columns: y_col = "below_msp_rate_pct"
                    elif "transit_delay_rate_percent" in chart_df.columns: y_col = "transit_delay_rate_percent"

            if x_col and y_col and x_col in chart_df.columns and y_col in chart_df.columns:
                chart_df = chart_df.dropna(subset=[x_col, y_col])
                chart = generate_chart_spec(
                    kind=plan.chart_type,
                    data=chart_df,
                    x_col=x_col,
                    y_col=y_col
                )
        print("[ASK] chart completed")
                
        return AskResponse(
            answer=answer,
            insights=insights,
            chart=chart,
            data_source=source,
            filters_applied=filters.model_dump() if filters else None
        )
    except KeyError:
        return AskResponse(answer="I can analyze that domain, but the requested metric isn't available in the current data.")
    except ValueError as e:
        msg = str(e)
        if "Unsupported" in msg:
            answer = get_conversational_answer_from_groq(question, history)
            return AskResponse(answer=answer)
        return AskResponse(answer=msg)
    except Exception as e:
        import groq
        if isinstance(e, groq.AuthenticationError):
            return AskResponse(answer="Authentication Error: The Groq API key is invalid. Please check your .env file.")
        elif isinstance(e, groq.RateLimitError):
            return AskResponse(answer="Rate Limit Error: The Groq API rate limit has been exceeded. Please try again later.")
        elif isinstance(e, groq.APIError):
            return AskResponse(answer=f"Groq API Error: {str(e)}")
            
        return AskResponse(answer="Something went wrong while processing the analysis. Please try again.")
