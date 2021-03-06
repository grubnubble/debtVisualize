/*global define, describe, beforeEach, afterEach, it*/

define([
    'backbone',
    'sinon',
    'models/Loan',
    'collections/Loan',
    'models/Strategy'
], function (Backbone, sinon, LoanModel, LoanCollection, StrategyModel) {
	'use strict';

	describe('Loans', function () {
        var loan,
            loans,
            sandbox;

        beforeEach(function () {
            sandbox = sinon.sandbox.create();

            loan = new LoanModel({
                name: 'Test',
                amount: 1000.00,
                interest: 4.5,
                payment: 6
            });

            loans = new LoanCollection([loan]);
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('can get the decimal version of the interest', function () {
            loan.interestDecimal().should.equal(0.045);
        });

        it('can calculate period interest', function () {
            loan.calculatePeriodInterest(30).should.equal(3.7);
        });

        it('can apply interest', function () {
            var interestApplied = loan.applyInterest(30);
            
            interestApplied.should.equal(3.7);

            loan.get('amount').should.equal(1000 + interestApplied);
        });

        it('can apply a payment', function () {
            // Should pay regular payments
            var paymentMade = loan.makePayment(10);
            paymentMade.should.equal(10);
            loan.get('amount').should.equal(990.00);

            // Should pay only amount left
            paymentMade = loan.makePayment(1000);
            paymentMade.should.equal(990);
            loan.get('amount').should.equal(0);
        });

        it('can clone', function () {
            var newLoans,
                changedCount = 0;

            loan.on('change', function () {
                changedCount += 1;
            });

            newLoans = loans.clone();

            newLoans.at(0).on('change', function () {
                changedCount += 1;
            });

            newLoans.at(0).makePayment(10);

            changedCount.should.equal(1);

            loans.at(0).makePayment(10);

            changedCount.should.equal(2);
        });

        it('can amortize', function () {
            var data = loans.amortize(30, new StrategyModel());

            data.length.should.equal(261);
            data[data.length-1].totals.amount.should.equal(0);
        });

        it('throws an error when negatively amortizing', function () {
            loan.set('amount', 7000.00);

            var amortizeLoan = function () {
                loans.amortize(30, new StrategyModel());
            };

            amortizeLoan.should.throw('Cannot have a negatively amortized loan, increase minimum payments');
        });

        it('can serialize data for a url', function () {
            var serialized = loan.serializeForUrl(),
                otherLoan = new LoanModel({
                    name: 'Other',
                    amount: 2000,
                    interest: 2.5,
                    payment: 5.1
                });

            serialized.should.equal('Test|1000|4.5|6');

            loan.set('name', 'Something with a space');

            serialized = loan.serializeForUrl();

            serialized.should.equal('Something+with+a+space|1000|4.5|6');

            loans.add(otherLoan);

            serialized = loans.serializeForUrl();

            serialized.should.equal('Something+with+a+space|1000|4.5|6&Other|2000|2.5|5.1');
        });

        it('can load from serialized url', function () {
            var serializedLoan = LoanModel.fromSerializedUrl('Something+with+a+space|1000|4.5|6');

            serializedLoan.get('name').should.equal('Something with a space');
            serializedLoan.get('amount').should.equal(1000);
            serializedLoan.get('interest').should.equal(4.5);
            serializedLoan.get('payment').should.equal(6);

            serializedLoan = LoanCollection.fromSerializedUrl('Something+with+a+space|1000|4.5|6&Other|2000|2.5|5.1');

            serializedLoan.length.should.equal(2);

            serializedLoan.at(0).get('name').should.equal('Something with a space');
            serializedLoan.at(0).get('amount').should.equal(1000);
            serializedLoan.at(0).get('interest').should.equal(4.5);
            serializedLoan.at(0).get('payment').should.equal(6);

            serializedLoan.at(1).get('name').should.equal('Other');
            serializedLoan.at(1).get('amount').should.equal(2000);
            serializedLoan.at(1).get('interest').should.equal(2.5);
            serializedLoan.at(1).get('payment').should.equal(5.1);
        });
    });
});