router.get('/staff/showroom/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const showroom = await Showroom.findById(id);
        
        // Detect user agent
        const userAgent = req.headers['user-agent'];
        const isMobile = /mobile|android|ios/i.test(userAgent);
        
        if (isMobile) {
            // Redirect to Flutter app deep link
            res.redirect(`rsastaff://signIn?showroomId=${id}`);
        } else {
            // Redirect to web dashboard
            res.redirect(`https://your-react-dashboard.com/staff/register?showroomId=${id}`);
        }
    } catch (error) {
        res.status(404).send('Showroom not found');
    }
});
