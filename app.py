from flask import Flask, jsonify, request, render_template, redirect, url_for, session
import sqlite3
import json
from flask_cors import CORS
import os
from math import ceil
from middleware_access import register_ip_access_control  # IP + quyền truy cập

app = Flask(__name__)
CORS(app)
app.secret_key = 'supersecretkey'

# Kích hoạt middleware kiểm soát IP
register_ip_access_control(app, base_path='/home/deploy/myapps')

# Đường dẫn tuyệt đối tới database trên VPS
DB_PATH = '/home/deploy/myapps/shared_data/products.db'

# Get the path to the directory containing the Python script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Construct the path to the JSON file using the script directory
json_file_path = os.path.join(script_dir, 'static', 'exchange_rates.json')

# Read exchange rates from JSON file
try:
    with open(json_file_path, encoding='utf-8') as f:
        exchange_rates = json.load(f)
except json.JSONDecodeError:
    exchange_rates = {}
    print("Error reading exchange rates JSON file.")

# Đăng nhập phân quyền
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form['password']
        if password == 'Truong@2004':
            session['authenticated'] = True
            session['role'] = 'manager'
            return redirect(url_for('home'))
        elif password == 'Truong@123':
            session['authenticated'] = True
            session['role'] = 'staff'
            return redirect(url_for('home'))
        else:
            return "Incorrect password!", 403
    return render_template('login.html')

@app.route('/')
def home():
    if not session.get('authenticated'):
        return redirect(url_for('login'))
    return render_template('index.html')

def query_products_by_codes(codes):
    code_order = {code: index for index, code in enumerate(codes)}
    codes_lower = [code.lower() for code in codes]
    code_to_original = {code.lower(): code for code in codes}
    code_results = {code: None for code in codes}

    query = "SELECT Name, Code, CAS, Brand, Size, Ship, Price, Note FROM products WHERE LOWER(Code) IN ({})"
    placeholders = ', '.join(['?'] * len(codes))

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT CAS, Brand FROM products WHERE Brand IN ("CẤM NHẬP", "Phụ lục II", "TỒN KHO")')
        special_cas_list = cursor.fetchall()
        special_cas_dict = {cas.strip(): brand for cas, brand in special_cas_list if cas}

        cursor.execute(query.format(placeholders), codes_lower)
        for row in cursor.fetchall():
            Name, Code, CAS, Brand, Size, Ship, Price, Note = row
            try:
                Ship = float(Ship) if Ship is not None else 0
            except ValueError:
                Ship = 0
            try:
                Price = float(Price) if Price is not None else 0
            except ValueError:
                Price = 0
            try:
                exchange_rate = float(exchange_rates.get(Brand, 1))
            except ValueError:
                exchange_rate = 1

            Unit_price = Price * Ship * exchange_rate
            Unit_price_rounded = round(Unit_price, -3)

            warning_type = special_cas_dict.get(CAS.strip()) if CAS else None

            original_code = code_to_original.get(Code.lower(), Code)
            code_results[original_code] = {
                "Name": Name,
                "Code": Code,
                "CAS": CAS,
                "Brand": Brand,
                "Size": Size,
                "Unit_price": Unit_price_rounded,
                "Note": Note,
                "WarningType": warning_type
            }

    results = []
    for code in codes:
        if code_results[code] is not None:
            results.append(code_results[code])
        else:
            results.append({
                "Name": "",
                "Code": code,
                "CAS": "",
                "Brand": "",
                "Size": "",
                "Unit_price": "",
                "Note": "",
                "WarningType": ""
            })

    return results

@app.route('/search', methods=['POST'])
def search():
    if not session.get('authenticated'):
        return redirect(url_for('login'))

    data = request.json
    codes = data.get('codes', [])
    page = data.get('page', 1)
    page_size = data.get('page_size', 10)

    if not isinstance(codes, list) or len(codes) > 500:
        return jsonify({"error": "Invalid input"}), 400

    all_results = query_products_by_codes(codes)
    total_pages = ceil(len(all_results) / page_size)
    start_index = (page - 1) * page_size
    end_index = start_index + page_size
    results = all_results[start_index:end_index]

    return jsonify({
        "results": results,
        "total_pages": total_pages,
        "current_page": page
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
