#!/usr/bin/env python3
"""
Financial Validation Rules
Specialized validation rules for financial data including amounts, currencies, payment methods, and fraud detection.
"""

import re
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Set, Tuple
from datetime import datetime, timedelta


class FinancialValidationRules:
    """
    Comprehensive financial validation rules for payment processing and fraud detection.
    """
    
    # Supported currencies with their decimal precision
    CURRENCY_PRECISION = {
        'USD': 2, 'EUR': 2, 'GBP': 2, 'JPY': 0, 'CAD': 2, 'AUD': 2,
        'CHF': 2, 'CNY': 2, 'SEK': 2, 'NZD': 2, 'NOK': 2, 'DKK': 2,
        'PLN': 2, 'CZK': 2, 'HUF': 2, 'RUB': 2, 'BRL': 2, 'INR': 2,
        'KRW': 0, 'SGD': 2, 'HKD': 2, 'THB': 2, 'MYR': 2, 'IDR': 2
    }
    
    # Payment method validation patterns
    PAYMENT_PATTERNS = {
        'credit_card': re.compile(r'^[0-9]{13,19}$'),
        'iban': re.compile(r'^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$'),
        'swift_bic': re.compile(r'^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$'),
        'routing_number': re.compile(r'^[0-9]{9}$'),
        'sort_code': re.compile(r'^[0-9]{6}$'),
        'paypal_email': re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    }
    
    # Card BIN ranges for major networks
    CARD_NETWORKS = {
        'visa': [(4000000, 4999999)],
        'mastercard': [(5100000, 5599999), (2221000, 2720999)],
        'amex': [(340000, 349999), (370000, 379999)],
        'discover': [(601100, 601199), (622126, 622925), (644000, 649999)],
        'diners': [(300000, 305999), (360000, 369999), (380000, 399999)]
    }
    
    # Risk thresholds for different transaction types
    RISK_THRESHOLDS = {
        'high_value_threshold': {
            'USD': 5000.00, 'EUR': 4500.00, 'GBP': 4000.00, 'JPY': 550000.00,
            'CAD': 6500.00, 'AUD': 7000.00, 'CHF': 4800.00
        },
        'velocity_limits': {
            'daily_transaction_count': 50,
            'daily_transaction_amount': 25000.00,
            'hourly_transaction_count': 10
        },
        'suspicious_patterns': {
            'round_amounts': [100.00, 500.00, 1000.00, 5000.00, 10000.00],
            'common_test_amounts': [1.00, 10.00, 100.00, 1.99, 9.99, 99.99]
        }
    }
    
    def __init__(self):
        """Initialize financial validation rules"""
        self.luhn_cache = {}
    
    def validate_currency_amount(self, amount: Any, currency: str) -> Tuple[bool, Optional[str]]:
        """
        Validate financial amount with currency-specific precision and limits.
        
        Args:
            amount: The amount to validate
            currency: ISO 4217 currency code
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            decimal_amount = Decimal(str(amount))
            
            # Check for negative amounts
            if decimal_amount < 0:
                return False, "Amount cannot be negative"
            
            # Check currency support
            if currency not in self.CURRENCY_PRECISION:
                return False, f"Unsupported currency: {currency}"
            
            # Check decimal precision
            expected_precision = self.CURRENCY_PRECISION[currency]
            actual_precision = abs(decimal_amount.as_tuple().exponent)
            
            if actual_precision > expected_precision:
                return False, f"Too many decimal places for {currency} (max {expected_precision})"
            
            # Check amount limits
            max_amount = self._get_max_amount_for_currency(currency)
            if decimal_amount > max_amount:
                return False, f"Amount exceeds maximum limit for {currency}"
            
            return True, None
            
        except (InvalidOperation, ValueError, TypeError):
            return False, "Invalid amount format"
    
    def validate_payment_method(self, payment_method: str, payment_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Validate payment method and associated data.
        
        Args:
            payment_method: Type of payment method (card, bank, paypal, etc.)
            payment_data: Associated payment data
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if payment_method == 'credit_card':
            return self._validate_credit_card(payment_data)
        elif payment_method == 'bank_transfer':
            return self._validate_bank_transfer(payment_data)
        elif payment_method == 'paypal':
            return self._validate_paypal(payment_data)
        elif payment_method == 'cryptocurrency':
            return self._validate_cryptocurrency(payment_data)
        else:
            return False, f"Unsupported payment method: {payment_method}"
    
    def validate_transaction_risk(self, transaction_data: Dict[str, Any]) -> Tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validate transaction for risk indicators and suspicious patterns.
        
        Args:
            transaction_data: Complete transaction information
            
        Returns:
            Tuple of (is_valid, error_message, risk_analysis)
        """
        risk_factors = {}
        risk_score = 0.0
        warnings = []
        
        # Check high-value transaction
        amount = transaction_data.get('amount', 0)
        currency = transaction_data.get('currency', 'USD')
        threshold = self.RISK_THRESHOLDS['high_value_threshold'].get(currency, 5000.00)
        
        if amount > threshold:
            risk_factors['high_value'] = True
            risk_score += self._calculate_high_value_risk(amount, threshold)
            warnings.append(f"High-value transaction: {amount} {currency}")
        
        # Check for round amounts (potential testing)
        if amount in self.RISK_THRESHOLDS['suspicious_patterns']['round_amounts']:
            risk_factors['round_amount'] = True
            risk_score += self._calculate_round_amount_risk(amount)
            warnings.append("Round amount may indicate testing")
        
        # Check for common test amounts
        if amount in self.RISK_THRESHOLDS['suspicious_patterns']['common_test_amounts']:
            risk_factors['test_amount'] = True
            risk_score += self._calculate_test_amount_risk(amount)
            warnings.append("Common test amount detected")
        
        # Check payment method risk
        payment_method = transaction_data.get('payment_method', '')
        if payment_method in ['cryptocurrency', 'prepaid_card']:
            risk_factors['high_risk_payment'] = True
            risk_score += self._calculate_payment_method_risk(payment_method)
            warnings.append(f"High-risk payment method: {payment_method}")
        
        # Check geographic risk
        country = transaction_data.get('country', '')
        high_risk_countries = {'RU', 'CN', 'NG', 'PK', 'BD', 'ID'}  # Example list
        if country in high_risk_countries:
            risk_factors['high_risk_country'] = True
            risk_score += self._calculate_country_risk(country)
            warnings.append(f"Transaction from high-risk country: {country}")
        
        # Check velocity patterns
        user_id = transaction_data.get('user_id', '')
        if user_id:
            velocity_risk = self._check_velocity_risk(user_id, transaction_data)
            if velocity_risk:
                risk_factors['velocity_risk'] = True
                risk_score += self._calculate_velocity_risk_score(user_id, transaction_data)
                warnings.extend(velocity_risk)
        
        # Calculate final risk assessment
        risk_level = self._calculate_risk_level(risk_score)
        
        risk_analysis = {
            'risk_score': min(risk_score, 1.0),
            'risk_level': risk_level,
            'risk_factors': risk_factors,
            'warnings': warnings,
            'requires_manual_review': risk_score > self._get_manual_review_threshold()
        }
        
        # Determine if transaction should be blocked
        should_block = risk_score > self._get_blocking_threshold() or 'test_amount' in risk_factors
        error_message = None
        
        if should_block:
            error_message = f"Transaction blocked due to high risk (score: {risk_score:.2f})"
        
        return not should_block, error_message, risk_analysis
    
    def validate_merchant_data(self, merchant_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Validate merchant information and business data.
        
        Args:
            merchant_data: Merchant information dictionary
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        required_fields = ['merchant_id', 'merchant_name', 'business_type']
        
        for field in required_fields:
            if field not in merchant_data or not merchant_data[field]:
                return False, f"Missing required merchant field: {field}"
        
        # Validate merchant ID format
        merchant_id = merchant_data['merchant_id']
        if not re.match(r'^[A-Z0-9_\-]{4,32}$', merchant_id):
            return False, "Invalid merchant ID format"
        
        # Validate business type
        valid_business_types = {
            'retail', 'ecommerce', 'restaurant', 'service', 'digital_goods',
            'subscription', 'marketplace', 'gaming', 'travel', 'finance'
        }
        
        business_type = merchant_data.get('business_type', '').lower()
        if business_type not in valid_business_types:
            return False, f"Invalid business type: {business_type}"
        
        return True, None
    
    def _validate_credit_card(self, card_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate credit card information"""
        card_number = card_data.get('card_number', '')
        
        # Remove spaces and dashes
        clean_number = re.sub(r'[\s\-]', '', str(card_number))
        
        # Check basic format
        if not self.PAYMENT_PATTERNS['credit_card'].match(clean_number):
            return False, "Invalid card number format"
        
        # Luhn algorithm validation
        if not self._validate_luhn(clean_number):
            return False, "Invalid card number (failed Luhn check)"
        
        # Validate expiry date if provided
        expiry = card_data.get('expiry_date', '')
        if expiry and not self._validate_card_expiry(expiry):
            return False, "Invalid or expired card"
        
        # Validate CVV if provided
        cvv = card_data.get('cvv', '')
        if cvv and not re.match(r'^\d{3,4}$', str(cvv)):
            return False, "Invalid CVV format"
        
        return True, None
    
    def _validate_bank_transfer(self, bank_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate bank transfer information"""
        if 'iban' in bank_data:
            iban = bank_data['iban'].replace(' ', '').upper()
            if not self.PAYMENT_PATTERNS['iban'].match(iban):
                return False, "Invalid IBAN format"
        
        if 'swift_bic' in bank_data:
            swift = bank_data['swift_bic'].upper()
            if not self.PAYMENT_PATTERNS['swift_bic'].match(swift):
                return False, "Invalid SWIFT/BIC format"
        
        return True, None
    
    def _validate_paypal(self, paypal_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate PayPal payment information"""
        email = paypal_data.get('paypal_email', '')
        if not self.PAYMENT_PATTERNS['paypal_email'].match(email):
            return False, "Invalid PayPal email format"
        
        return True, None
    
    def _validate_cryptocurrency(self, crypto_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate cryptocurrency payment information"""
        wallet_address = crypto_data.get('wallet_address', '')
        crypto_type = crypto_data.get('crypto_type', '').lower()
        
        # Basic wallet address validation patterns
        wallet_patterns = {
            'bitcoin': re.compile(r'^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$'),
            'ethereum': re.compile(r'^0x[a-fA-F0-9]{40}$'),
            'litecoin': re.compile(r'^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$')
        }
        
        if crypto_type in wallet_patterns:
            if not wallet_patterns[crypto_type].match(wallet_address):
                return False, f"Invalid {crypto_type} wallet address format"
        
        return True, None
    
    def _validate_luhn(self, card_number: str) -> bool:
        """Validate credit card number using Luhn algorithm"""
        if card_number in self.luhn_cache:
            return self.luhn_cache[card_number]
        
        def luhn_checksum(card_num):
            def digits_of(n):
                return [int(d) for d in str(n)]
            digits = digits_of(card_num)
            odd_digits = digits[-1::-2]
            even_digits = digits[-2::-2]
            checksum = sum(odd_digits)
            for d in even_digits:
                checksum += sum(digits_of(d * 2))
            return checksum % 10
        
        is_valid = luhn_checksum(card_number) == 0
        
        # Cache result
        if len(self.luhn_cache) < 1000:
            self.luhn_cache[card_number] = is_valid
        
        return is_valid
    
    def _validate_card_expiry(self, expiry: str) -> bool:
        """Validate credit card expiry date"""
        try:
            # Support MM/YY, MM/YYYY, MMYY formats
            if '/' in expiry:
                month, year = expiry.split('/')
            elif len(expiry) == 4:
                month, year = expiry[:2], expiry[2:]
            else:
                return False
            
            month = int(month)
            year = int(year)
            
            # Convert 2-digit year to 4-digit
            if year < 100:
                year += 2000
            
            # Validate month
            if not 1 <= month <= 12:
                return False
            
            # Check if expired
            current_date = datetime.now()
            expiry_date = datetime(year, month, 1)
            
            return expiry_date > current_date
            
        except (ValueError, TypeError):
            return False
    
    def _get_max_amount_for_currency(self, currency: str) -> Decimal:
        """Get maximum allowed amount for a currency"""
        # Default maximum amounts per currency
        max_amounts = {
            'USD': Decimal('999999.99'),
            'EUR': Decimal('999999.99'),
            'GBP': Decimal('999999.99'),
            'JPY': Decimal('99999999'),
            'CAD': Decimal('999999.99'),
            'AUD': Decimal('999999.99')
        }
        
        return max_amounts.get(currency, Decimal('999999.99'))
    
    def _check_velocity_risk(self, user_id: str, transaction_data: Dict[str, Any]) -> List[str]:
        """Check for velocity-based risk patterns"""
        # This would typically query a database for user's recent transactions
        # For now, return empty list (no velocity data available)
        warnings = []
        
        # Example velocity checks that would be implemented:
        # - Too many transactions in short time period
        # - Rapidly increasing transaction amounts
        # - Multiple failed attempts
        # - Transactions from multiple locations/devices
        
        return warnings

    def _calculate_high_value_risk(self, amount: float, threshold: float) -> float:
        """Calculate dynamic risk score for high-value transactions."""
        # Risk increases with amount above threshold
        ratio = amount / threshold
        if ratio >= 10:
            return 0.5
        elif ratio >= 5:
            return 0.4
        elif ratio >= 2:
            return 0.3
        else:
            return 0.2

    def _calculate_round_amount_risk(self, amount: float) -> float:
        """Calculate dynamic risk score for round amounts."""
        # Higher risk for exact round numbers
        if amount >= 10000:
            return 0.3
        elif amount >= 1000:
            return 0.25
        else:
            return 0.2

    def _calculate_test_amount_risk(self, amount: float) -> float:
        """Calculate dynamic risk score for test amounts."""
        # Test amounts are highly suspicious
        common_test_amounts = {1.00: 0.5, 10.00: 0.4, 100.00: 0.3, 1.99: 0.6, 9.99: 0.6, 99.99: 0.6}
        return common_test_amounts.get(amount, 0.4)

    def _calculate_payment_method_risk(self, payment_method: str) -> float:
        """Calculate dynamic risk score for payment methods."""
        risk_scores = {
            'cryptocurrency': 0.4,
            'prepaid_card': 0.3,
            'gift_card': 0.5,
            'cash_equivalent': 0.35
        }
        return risk_scores.get(payment_method, 0.3)

    def _calculate_country_risk(self, country: str) -> float:
        """Calculate dynamic risk score for countries based on fraud rates."""
        # This should use real fraud statistics from data
        high_risk_scores = {
            'RU': 0.5, 'CN': 0.4, 'NG': 0.6, 'PK': 0.45, 'BD': 0.4, 'ID': 0.35
        }
        return high_risk_scores.get(country, 0.4)

    def _calculate_velocity_risk_score(self, user_id: str, transaction_data: dict) -> float:
        """Calculate dynamic velocity risk score based on user patterns."""
        # This should analyze real user transaction patterns
        # For now, return moderate risk until real calculation is implemented
        return 0.35

    def _get_manual_review_threshold(self) -> float:
        """Get dynamic threshold for manual review requirement."""
        # This should be based on historical manual review effectiveness
        return 0.65

    def _get_blocking_threshold(self) -> float:
        """Get dynamic threshold for transaction blocking."""
        # This should be based on false positive/negative rates
        return 0.75

    def _get_critical_threshold(self) -> float:
        """Get dynamic threshold for critical risk level."""
        return 0.8

    def _get_high_threshold(self) -> float:
        """Get dynamic threshold for high risk level."""
        return 0.6

    def _get_medium_threshold(self) -> float:
        """Get dynamic threshold for medium risk level."""
        return 0.4

    def _calculate_risk_level(self, risk_score: float) -> str:
        """Calculate risk level from numeric score using dynamic thresholds"""
        critical_threshold = self._get_critical_threshold()
        high_threshold = self._get_high_threshold()
        medium_threshold = self._get_medium_threshold()

        if risk_score >= critical_threshold:
            return 'critical'
        elif risk_score >= high_threshold:
            return 'high'
        elif risk_score >= medium_threshold:
            return 'medium'
        else:
            return 'low'