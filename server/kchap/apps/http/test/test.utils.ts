
/**
 * Utility method that helps sort the random order array containing
 * the user balances. Although it is not preferable to process the
 * service response, it was selected because if a test.result needs 
 * to be modified, then we only apply that modification to the results
 * file and not in every test (since then we would need to pass the
 * expected result properties by hand)
 * 
 * @param res Result
 */
export function sortUserIds(res) {
    res.sort(function (a, b) {
        return a.userId - b.userId;
    });
}